import json
import sqlite3

from fastapi.testclient import TestClient
from helden_training.backend.app import create_app, SCHEMA
from tests.test_api import client, setup_training, start, HEADERS


def test_assignment_roundtrip_and_old_clients_preserve_groups(client):
    profile, exercise, plan = setup_training(client)
    url = f"/api/exercises/{exercise['id']}"
    body = {'name': exercise['name'], 'categories': exercise['categories']}
    assert exercise['assignment_groups'] == []
    for groups in [['STS'], ['SAM'], ['STS', 'SAM'], []]:
        updated = client.put(url, json={**body, 'assignment_groups': groups})
        assert updated.status_code == 200
        assert updated.json()['assignment_groups'] == groups
        assert client.put(url, json=body).json()['assignment_groups'] == groups
    assert client.put(url, json={**body, 'assignment_groups': ['STS', 'STS']}).json()['assignment_groups'] == ['STS']
    assert client.put(url, json={**body, 'assignment_groups': ['OTHER']}).status_code == 422
    assert client.put(url, json={**body, 'assignment_groups': ['STS', 'SAM', 'STS']}).status_code == 422
    snapshot = start(client, profile, plan)
    client.put(url, json={**body, 'assignment_groups': ['SAM']})
    assert client.get(f"/api/sessions/{snapshot['id']}").json()['items'][0]['exercise']['assignment_groups'] == ['STS']
    assert json.loads(client.get('/api/export').json()['tables']['exercises'][0]['assignment_groups']) == ['SAM']


def test_plan_filter_is_persisted_without_removing_selected_exercises(client):
    _, exercise, plan = setup_training(client)
    url = f"/api/plans/{plan['id']}"
    body = {'name': plan['name'], 'category': plan['category'], 'items': plan['items']}
    assert plan['assignment_filter'] == 'all'
    for filter_value in ['STS', 'SAM', 'unassigned', 'all']:
        updated = client.put(url, json={**body, 'assignment_filter': filter_value})
        assert updated.status_code == 200
        assert updated.json()['assignment_filter'] == filter_value
        assert updated.json()['items'][0]['exercise_id'] == exercise['id']
        assert client.put(url, json=body).json()['assignment_filter'] == filter_value
        assert client.get('/api/plans').json()[0]['assignment_filter'] == filter_value
    assert client.put(url, json={**body, 'assignment_filter': 'other'}).status_code == 422


def test_migration_preserves_legacy_plans_profiles_and_snapshot(tmp_path):
    old_schema = SCHEMA.replace(" assignment_groups TEXT NOT NULL DEFAULT '[]',\n", '').replace(", assignment_filter TEXT NOT NULL DEFAULT 'all'", '')
    with sqlite3.connect(tmp_path / 'training.sqlite') as conn:
        conn.executescript(old_schema)
        conn.execute("INSERT INTO profiles(name,color) VALUES ('Alt','#d9f36a')")
        conn.execute("INSERT INTO exercises(name,categories,muscles,equipment,notes,start_seconds) VALUES ('Alt','[\"Beine\"]','Quadrizeps','','Notiz',0)")
        conn.execute("INSERT INTO plans(name,category,target_muscles) VALUES ('Altplan','Beine','[\"Quadrizeps\"]')")
        conn.execute('INSERT INTO plan_items(plan_id,exercise_id,position,sets,reps,rest_seconds,weight) VALUES (1,1,0,3,10,60,20)')
    for attempt in range(2):
        with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as c:
            assert c.get('/api/exercises').json()[0]['assignment_groups'] == []
            assert c.get('/api/exercises').json()[0]['notes'] == 'Notiz'
            plan = c.get('/api/plans').json()[0]
            assert plan['assignment_filter'] == 'all' and plan['target_muscles'] == ['Quadrizeps']
            assert plan['items'][0]['weight'] == 20
            assert c.get('/api/profiles').json()[0]['name'] == 'Alt'
            if not attempt:
                session = start(c, {'id': 1}, plan)
                identifier = session['id']
        if not attempt:
            with sqlite3.connect(tmp_path / 'training.sqlite') as conn:
                row = conn.execute('SELECT id,snapshot FROM session_items').fetchone()
                old = json.loads(row[1]); old.pop('assignment_groups', None)
                conn.execute('UPDATE session_items SET snapshot=? WHERE id=?', (json.dumps(old), row[0]))
    with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as c:
        assert c.get(f'/api/sessions/{identifier}').json()['items'][0]['exercise']['assignment_groups'] == []
