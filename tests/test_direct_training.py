import sqlite3
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient
from helden_training.backend.app import create_app, SCHEMA
from tests.test_api import client, setup_training, start, log_path, HEADERS


def direct_body(profile, exercise, **changes):
    return {'profile_id': profile['id'], 'name': 'Spontanes Training', 'category': 'Oberkörper',
            'items': [{'exercise_id': exercise['id'], 'sets': 2, 'reps': 7, 'weight': 15, 'rest_seconds': 90}], **changes}


def test_direct_session_without_plan_uses_normal_snapshots_history_and_logs(client):
    profile = client.post('/api/profiles', json={'name': 'Direkt'}).json()
    exercise = client.post('/api/exercises', json={'name': 'Bankdrücken', 'categories': ['Push'], 'muscles': 'Brust', 'assignment_groups': ['STS']}).json()
    result = client.post('/api/sessions/direct', json=direct_body(profile, exercise))
    assert result.status_code == 201, result.text
    session = result.json()
    assert session['source'] == 'direct' and session['plan_name'] == 'Spontanes Training'
    assert session['items'][0]['weight'] == 15 and session['items'][0]['reps'] == 7
    assert client.get('/api/plans').json() == []
    client.put(f"/api/exercises/{exercise['id']}", json={'name': 'Geändert', 'categories': ['Pull'], 'assignment_groups': ['SAM']})
    read = client.get(f"/api/sessions/{session['id']}").json()
    assert read['items'][0]['exercise']['name'] == 'Bankdrücken'
    assert read['items'][0]['exercise']['assignment_groups'] == ['STS']
    assert client.put(log_path(session), json={'weight': 15, 'reps': 7, 'notes': 'Direkt'}).status_code == 200
    finished = client.post(f"/api/sessions/{session['id']}/finish").json()
    assert finished['source'] == 'direct'
    summary = client.get(f"/api/sessions?profile_id={profile['id']}").json()[0]
    assert summary['volume'] == 105 and summary['logged_sets'] == 1
    edit = {'plan_name': 'Korrigiert', 'started_at': finished['started_at'], 'finished_at': finished['finished_at'],
            'items': [{'id': i['id'], 'skipped': i['skipped'], 'logs': i['logs']} for i in finished['items']]}
    assert client.put(f"/api/sessions/{session['id']}/history", json=edit).json()['source'] == 'direct'
    assert client.delete(f"/api/sessions/{session['id']}").status_code == 204
    assert client.get('/api/export').json()['tables']['sessions'] == []


def test_suggestions_use_latest_completed_training_and_are_profile_specific(client):
    profile, exercise, plan = setup_training(client)
    other = client.post('/api/profiles', json={'name': 'Andere Person'}).json()
    old = start(client, profile, plan)
    client.put(log_path(old), json={'weight': 21, 'reps': 8})
    client.put(log_path(old, 2), json={'weight': 22, 'reps': 6})
    client.post(f"/api/sessions/{old['id']}/finish")
    latest = client.post('/api/sessions/direct', json=direct_body(profile, exercise)).json()
    client.put(log_path(latest, 2), json={'weight': 35, 'reps': 9})
    client.post(f"/api/sessions/{latest['id']}/finish")
    current = start(client, profile, plan)
    client.put(log_path(current), json={'weight': 100, 'reps': 1})
    other_session = start(client, other, plan)
    client.put(log_path(other_session), json={'weight': 55, 'reps': 12})
    client.post(f"/api/sessions/{other_session['id']}/finish")
    hints = client.get(f"/api/profiles/{profile['id']}/exercise-suggestions").json()
    assert hints[str(exercise['id'])]['weight'] == 35
    assert hints[str(exercise['id'])]['reps'] == 9
    assert client.get(f"/api/profiles/{other['id']}/exercise-suggestions").json()[str(exercise['id'])]['weight'] == 55
    client.delete(f"/api/sessions/{latest['id']}")
    assert client.get(f"/api/profiles/{profile['id']}/exercise-suggestions").json()[str(exercise['id'])]['weight'] == 21
    assert client.get('/api/profiles/999999/exercise-suggestions').status_code == 404


def test_direct_start_is_atomic_and_preserves_order(client):
    profile, exercise, plan = setup_training(client)
    second = client.post('/api/exercises', json={'name': 'Zweite', 'categories': ['Push']}).json()
    body = direct_body(profile, exercise)
    body['items'].insert(0, {'exercise_id': second['id'], 'sets': 1, 'reps': 5, 'weight': 0, 'rest_seconds': 0})
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: client.post('/api/sessions/direct', json=body), range(2)))
    assert sorted(r.status_code for r in results) == [201, 409]
    session = next(r.json() for r in results if r.status_code == 201)
    assert [i['exercise_id'] for i in session['items']] == [second['id'], exercise['id']]
    assert len(client.get('/api/plans').json()) == 1
    assert client.post('/api/sessions', json={'profile_id': profile['id'], 'plan_id': plan['id']}).status_code == 409


def test_invalid_direct_start_does_not_create_partial_training(client):
    profile, exercise, plan = setup_training(client)
    for body in [direct_body(profile, exercise, items=[]), direct_body(profile, exercise, category='invalid'),
                 direct_body(profile, exercise, name='  '), direct_body(profile, exercise, items=[{'exercise_id': 999999}])]:
        assert client.post('/api/sessions/direct', json=body).status_code in [404, 422]
        assert client.get(f"/api/sessions?profile_id={profile['id']}").json() == []
    client.delete(f"/api/exercises/{exercise['id']}")
    assert client.post('/api/sessions/direct', json=direct_body(profile, exercise)).status_code == 404
    assert client.post('/api/sessions/direct', json=direct_body(profile, exercise), headers={'X-Helden-Request': ''}).status_code == 403


def test_legacy_session_source_migration_is_repeatable(tmp_path):
    old_schema = SCHEMA.replace(",\n source TEXT NOT NULL DEFAULT 'plan'", '')
    with sqlite3.connect(tmp_path / 'training.sqlite') as conn:
        conn.executescript(old_schema)
        conn.execute("INSERT INTO profiles(name,color) VALUES ('Alt','#d9f36a')")
        conn.execute("INSERT INTO sessions(profile_id,plan_name,category,started_at,finished_at) VALUES (1,'Altplan','Beine','2026-01-01T10:00:00Z','2026-01-01T11:00:00Z')")
    for _ in range(2):
        with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as c:
            old = c.get('/api/sessions/1').json()
            assert old['source'] == 'plan' and old['plan_name'] == 'Altplan'
