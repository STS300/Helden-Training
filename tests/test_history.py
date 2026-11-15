import sqlite3
from copy import deepcopy

from fastapi.testclient import TestClient
from helden_training.backend.app import create_app, SCHEMA
from tests.test_api import client, setup_training, start, log_path, HEADERS


def edit_body(session):
    return {'plan_name': session['plan_name'], 'started_at': session['started_at'], 'finished_at': session['finished_at'],
            'items': [{'id': i['id'], 'skipped': i['skipped'], 'logs': i['logs']} for i in session['items']]}


def test_history_edit_updates_stats_and_suggestions_without_changing_plan(client):
    profile, exercise, plan = setup_training(client)
    session = start(client, profile, plan)
    client.put(log_path(session), json={'weight': 25, 'reps': 8, 'notes': 'old'})
    session = client.post(f"/api/sessions/{session['id']}/finish").json()
    body = edit_body(session)
    body['plan_name'] = 'Korrigiertes Training'
    body['started_at'] = '2026-10-01T10:00:00+07:00'
    body['finished_at'] = '2026-10-01T11:00:00+07:00'
    body['items'][0]['logs'] = [{'set_index': 2, 'weight': 32.5, 'reps': 12, 'notes': 'corrected'}]
    response = client.put(f"/api/sessions/{session['id']}/history", json=body)
    assert response.status_code == 200, response.text
    updated = response.json()
    assert updated['started_at'] == '2026-10-01T03:00:00+00:00'
    assert updated['items'][0]['exercise'] == session['items'][0]['exercise']
    assert client.get('/api/plans').json()[0]['name'] == plan['name']
    summary = client.get(f"/api/sessions?profile_id={profile['id']}").json()[0]
    assert summary['logged_sets'] == 1 and summary['volume'] == 390
    subsequent = start(client, profile, plan)
    assert subsequent['items'][0]['previous']['2']['weight'] == 32.5
    assert '1' not in subsequent['items'][0]['previous']
    assert client.delete(f"/api/sessions/{session['id']}").status_code == 204
    assert client.get(f"/api/sessions/{session['id']}").status_code == 404
    assert client.get(f"/api/sessions/{subsequent['id']}").json()['items'][0]['previous'] == {}
    export = client.get('/api/export').json()
    assert all(i['session_id'] != session['id'] for i in export['tables']['session_items'])


def test_history_validation_is_atomic_and_rejects_foreign_items(client):
    profile, exercise, plan = setup_training(client)
    session = start(client, profile, plan)
    assert client.put(f"/api/sessions/{session['id']}/history", json={**edit_body(session), 'finished_at': '2026-11-15T12:00:00Z'}).status_code == 409
    session = client.post(f"/api/sessions/{session['id']}/finish").json()
    url = f"/api/sessions/{session['id']}/history"
    base = edit_body(session)
    cases = []
    bad = deepcopy(base); bad['items'][0]['id'] += 100; cases.append(bad)
    bad = deepcopy(base); bad['items'] *= 2; cases.append(bad)
    bad = deepcopy(base); bad['items'][0]['logs'] = [{'set_index': 3, 'weight': 10, 'reps': 5}]; cases.append(bad)
    bad = deepcopy(base); bad['items'][0]['logs'] = [{'set_index': 1, 'weight': 10, 'reps': 5}]*2; cases.append(bad)
    bad = deepcopy(base); bad['finished_at'] = '2000-01-01T00:00:00Z'; cases.append(bad)
    bad = deepcopy(base); bad['started_at'] = '2026-01-01T00:00:00'; cases.append(bad)
    for body in cases:
        assert client.put(url, json=body).status_code == 422
        assert edit_body(client.get(f"/api/sessions/{session['id']}").json()) == base
    assert client.delete(f"/api/sessions/{session['id']}", headers={'X-Helden-Request': ''}).status_code == 403
    assert client.delete(f"/api/sessions/{session['id']}").status_code == 204
    assert client.delete(f"/api/sessions/{session['id']}").status_code == 404


def test_delete_active_training_frees_profile_and_preserves_other_profiles(client):
    profile, exercise, plan = setup_training(client)
    other = client.post('/api/profiles', json={'name': 'Alex'}).json()
    first = start(client, profile, plan)
    second = start(client, other, plan)
    client.put(log_path(first), json={'weight': 25, 'reps': 8})
    assert client.delete(f"/api/sessions/{first['id']}").status_code == 204
    assert client.get(f"/api/sessions/{second['id']}").status_code == 200
    assert start(client, profile, plan)['id'] > second['id']
    assert client.get(f"/api/sessions/{first['id']}").status_code == 404
    assert client.put(log_path(first), json={'weight': 5, 'reps': 5}).status_code == 404


def test_plan_targets_roundtrip_preserve_for_old_clients_and_migrate(tmp_path):
    data = tmp_path / 'data'; data.mkdir()
    conn = sqlite3.connect(data / 'training.sqlite')
    conn.executescript(SCHEMA.replace(' target_muscles TEXT,', ''))
    conn.close()
    for attempt in range(2):
        with TestClient(create_app(data, ingress_only=False), headers=HEADERS) as client:
            if not attempt:
                profile, exercise, plan = setup_training(client)
                assert plan['target_muscles'] is None
                body = {'name': plan['name'], 'category': plan['category'], 'items': plan['items'], 'target_muscles': ['Quadrizeps', 'Gesäß']}
                updated = client.put(f"/api/plans/{plan['id']}", json=body).json()
                assert updated['target_muscles'] == ['Quadrizeps', 'Gesäß']
                body.pop('target_muscles')
                assert client.put(f"/api/plans/{plan['id']}", json=body).json()['target_muscles'] == ['Quadrizeps', 'Gesäß']
            else:
                assert client.get('/api/plans').json()[0]['target_muscles'] == ['Quadrizeps', 'Gesäß']
