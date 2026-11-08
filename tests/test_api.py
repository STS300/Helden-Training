from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from helden_training.backend.app import create_app

HEADERS = {'X-Helden-Request': '1'}
MP4 = b'\x00\x00\x00\x18ftypisom\x00\x00\x00\x00isommp42'


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as client:
        yield client


def setup_training(client):
    profile = client.post('/api/profiles', json={'name': 'Steffi'}).json()
    exercise = client.post('/api/exercises', json={'name': 'Kniebeugen', 'categories': ['Beine', 'Unterkörper']}).json()
    plan = client.post('/api/plans', json={'name': 'Beintag', 'category': 'Beine', 'items': [
        {'exercise_id': exercise['id'], 'sets': 2, 'reps': 10, 'weight': 20, 'rest_seconds': 60}]}).json()
    return profile, exercise, plan


def start(client, profile, plan):
    result = client.post('/api/sessions', json={'profile_id': profile['id'], 'plan_id': plan['id']})
    assert result.status_code == 201, result.text
    return result.json()


def log_path(session, index=1):
    return f"/api/sessions/{session['id']}/items/{session['items'][0]['id']}/sets/{index}"


def test_profiles_and_last_values_are_isolated(client):
    profile, exercise, plan = setup_training(client)
    other = client.post('/api/profiles', json={'name': 'Alex'}).json()
    first = start(client, profile, plan)
    assert client.put(log_path(first), json={'weight': 25, 'reps': 8}).status_code == 200
    # A retry updates the same set, never doubles the volume.
    assert client.put(log_path(first), json={'weight': 27.5, 'reps': 9}).status_code == 200
    assert len(client.get(f"/api/sessions/{first['id']}").json()['items'][0]['logs']) == 1
    client.post(f"/api/sessions/{first['id']}/finish")
    next_session = start(client, profile, plan)
    assert next_session['items'][0]['previous']['1']['weight'] == 27.5
    assert start(client, other, plan)['items'][0]['previous'] == {}
    summary = client.get(f"/api/sessions?profile_id={profile['id']}").json()
    assert summary[1]['volume'] == 247.5
    assert summary[1]['logged_sets'] == 1


def test_snapshot_survives_plan_and_video_changes(client):
    profile, exercise, plan = setup_training(client)
    path = f"/api/exercises/{exercise['id']}/video"
    assert client.put(path, content=MP4, headers={'Content-Type': 'video/mp4'}).status_code == 200
    session = start(client, profile, plan)
    client.put(f"/api/exercises/{exercise['id']}", json={'name': 'Neuer Name', 'categories': ['Push']})
    client.put(path, content=MP4 + b'new', headers={'Content-Type': 'video/mp4'})
    client.put(f"/api/plans/{plan['id']}", json={'name': 'Anderer Plan', 'category': 'Push', 'items': [
        {'exercise_id': exercise['id'], 'sets': 5, 'weight': 100}]})
    client.delete(f"/api/exercises/{exercise['id']}")
    detail = client.get(f"/api/sessions/{session['id']}").json()
    assert detail['plan_name'] == 'Beintag'
    assert detail['items'][0]['exercise']['name'] == 'Kniebeugen'
    assert detail['items'][0]['sets'] == 2
    video_path = f"/api/sessions/{session['id']}/items/{session['items'][0]['id']}/video"
    assert client.get(video_path).content == MP4
    ranged = client.get(video_path, headers={'Range': 'bytes=0-7'})
    assert ranged.status_code == 206
    assert ranged.content == MP4[:8]
    assert client.put(log_path(session), json={'weight': 30, 'reps': 10}).status_code == 200
    assert client.get('/api/exercises').json() == []


def test_resume_after_server_restart(tmp_path):
    with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as client:
        profile, _, plan = setup_training(client)
        session = start(client, profile, plan)
        client.put(log_path(session), json={'weight': 32.5, 'reps': 11, 'notes': 'Sitzhöhe 4'})
    with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as client:
        detail = client.get(f"/api/sessions/{session['id']}").json()
        assert detail['finished_at'] is None
        assert detail['items'][0]['logs'][0]['notes'] == 'Sitzhöhe 4'
        assert detail['items'][0]['logs'][0]['weight'] == 32.5
        assert client.post('/api/sessions', json={'profile_id': profile['id'], 'plan_id': plan['id']}).status_code == 409


def test_invalid_data_and_completed_session_protection(client):
    profile, _, plan = setup_training(client)
    assert client.post('/api/profiles', json={'name': '  '}).status_code == 422
    assert client.post('/api/exercises', json={'name': 'X', 'categories': ['Unsinn']}).status_code == 422
    assert client.post('/api/exercises', json={'name': 'X', 'categories': ['Push'], 'start_seconds': 5, 'end_seconds': 3}).status_code == 422
    assert client.post('/api/plans', json={'name': 'Leer', 'category': 'Push', 'items': []}).status_code == 422
    session = start(client, profile, plan)
    assert client.put(log_path(session, 3), json={'weight': 20, 'reps': 10}).status_code == 422
    assert client.put(log_path(session), json={'weight': -1, 'reps': 10}).status_code == 422
    assert client.put(log_path(session), json={'weight': 20, 'reps': 0}).status_code == 422
    assert client.put(log_path(session), content='{"weight":NaN,"reps":10}', headers={'Content-Type': 'application/json'}).status_code == 422
    assert client.delete(f"/api/profiles/{profile['id']}").status_code == 409
    assert client.post(f"/api/sessions/{session['id']}/finish").status_code == 200
    assert client.post(f"/api/sessions/{session['id']}/finish").status_code == 200
    assert client.put(log_path(session), json={'weight': 20, 'reps': 10}).status_code == 409
    assert client.delete(f"/api/profiles/{profile['id']}").status_code == 204
    assert client.get('/api/profiles').json() == []
    assert client.get(f"/api/sessions/{session['id']}").status_code == 200


def test_skip_and_cross_session_item_protection(client):
    profile, _, plan = setup_training(client)
    session = start(client, profile, plan)
    other = client.post('/api/profiles', json={'name': 'Alex'}).json()
    second = start(client, other, plan)
    item = session['items'][0]['id']
    assert client.put(f"/api/sessions/{second['id']}/items/{item}/sets/1", json={'weight': 20, 'reps': 10}).status_code == 404
    assert client.get(f"/api/sessions/{second['id']}/items/{item}/video").status_code == 404
    path = f"/api/sessions/{session['id']}/items/{item}/skip"
    assert client.put(path, json={'skipped': True}).status_code == 200
    assert client.put(log_path(session), json={'weight': 20, 'reps': 10}).status_code == 422
    assert client.put(path, json={'skipped': False}).status_code == 200
    assert client.put(log_path(session), json={'weight': 20, 'reps': 10}).status_code == 200


def test_upload_rejects_invalid_or_oversized_files(client, tmp_path, monkeypatch):
    _, exercise, _ = setup_training(client)
    path = f"/api/exercises/{exercise['id']}/video"
    assert client.put(path, content=b'not a video', headers={'Content-Type': 'video/mp4'}).status_code == 415
    assert client.put(path, content=MP4, headers={'Content-Type': 'text/html'}).status_code == 415
    assert client.put(path, content=MP4, headers={'Content-Type': 'video/mp4', 'Content-Length': str(513 * 1024 * 1024)}).status_code == 413
    monkeypatch.setenv('MAX_UPLOAD_MB', '1')
    with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as small:
        setup_training(small)
        assert small.put('/api/exercises/1/video', content=MP4 + b'x' * (1024 * 1024), headers={'Content-Type': 'video/mp4'}).status_code == 413
        assert list((tmp_path / 'videos').glob('*')) == []


def test_ingress_security_and_csrf(tmp_path):
    with TestClient(create_app(tmp_path, ingress_only=True), client=('10.0.0.5', 1234)) as client:
        assert client.get('/api/profiles', headers={'X-Forwarded-For': '172.30.32.2'}).status_code == 403
    with TestClient(create_app(tmp_path, ingress_only=True), client=('172.30.32.2', 1234)) as client:
        assert client.get('/api/health').status_code == 200
        assert client.post('/api/profiles', json={'name': 'A'}).status_code == 403
        assert client.post('/api/profiles', json={'name': 'A'}, headers={**HEADERS, 'Sec-Fetch-Site': 'cross-site'}).status_code == 403
        assert client.post('/api/profiles', json={'name': 'A'}, headers=HEADERS).status_code == 201


def test_export_and_missing_entries(client):
    setup_training(client)
    export = client.get('/api/export')
    assert export.status_code == 200
    assert export.json()['format_version'] == 1
    assert len(export.json()['tables']['profiles']) == 1
    assert 'attachment' in export.headers['content-disposition']
    assert client.get('/api/sessions/999').status_code == 404
    assert client.get('/api/exercises/999/video').status_code == 404


def test_concurrent_start_creates_only_one_session(client):
    profile, _, plan = setup_training(client)
    def begin(_):
        return client.post('/api/sessions', json={'profile_id': profile['id'], 'plan_id': plan['id']}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(begin, range(2))) == [201, 409]


def test_archived_exercise_plan_start_rolls_back(client):
    profile, exercise, plan = setup_training(client)
    client.delete(f"/api/exercises/{exercise['id']}")
    assert client.post('/api/sessions', json={'profile_id': profile['id'], 'plan_id': plan['id']}).status_code == 404
    assert client.get(f"/api/sessions?profile_id={profile['id']}").json() == []
