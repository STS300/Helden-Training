import json
import sqlite3

import pytest
from fastapi.testclient import TestClient

from helden_training.backend.app import SCHEMA, create_app
from tests.test_api import HEADERS, MP4, setup_training, start

LINK = 'https://1drv.ms/v/c/example/TEST?e=demo'
OTHER = 'https://onedrive.live.com/?cid=EXAMPLE&id=EXAMPLE%21123'


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as client:
        yield client


def test_link_only_exercise_is_saved_editable_and_exported(client):
    body = {'name': 'OneDrive-Übung', 'categories': ['Push'], 'onedrive_url': '  ' + LINK + '  '}
    result = client.post('/api/exercises', json=body)
    assert result.status_code == 201
    exercise = result.json()
    assert exercise['onedrive_url'] == LINK
    assert not exercise['has_video']
    assert client.get('/api/exercises').json()[0]['onedrive_url'] == LINK
    # Old clients that do not know the new field must not accidentally erase it.
    assert client.put(f"/api/exercises/{exercise['id']}", json={'name': 'Umbenannt', 'categories': ['Push']}).json()['onedrive_url'] == LINK
    exported = client.get('/api/export').json()['tables']['exercises'][0]
    assert exported['onedrive_url'] == LINK
    body['onedrive_url'] = ''
    assert client.put(f"/api/exercises/{exercise['id']}", json=body).json()['onedrive_url'] == ''


@pytest.mark.parametrize('link', [
    'javascript:alert(1)', 'http://1drv.ms/v/test', 'https://evil.example/test',
    'https://1drv.ms.evil.example/v/test', 'https://onedrive.live.com.evil.example/',
    'https://user:secret@1drv.ms/v/test', 'https://1drv.ms:8443/v/test',
    'https://1drv.ms\\@evil.example/', 'https://1drv.ms/v/white space',
    'https://1drv.ms/v/new\nline', 'https://[invalid/',
])
def test_invalid_or_unsafe_link_is_rejected(client, link):
    result = client.post('/api/exercises', json={'name': 'X', 'categories': ['Push'], 'onedrive_url': link})
    assert result.status_code == 422
    assert client.get('/api/exercises').json() == []


def test_session_keeps_link_snapshot_when_exercise_changes(client):
    profile, exercise, plan = setup_training(client)
    path = f"/api/exercises/{exercise['id']}"
    body = {'name': exercise['name'], 'categories': exercise['categories'], 'onedrive_url': LINK}
    assert client.put(path, json=body).status_code == 200
    session = start(client, profile, plan)
    assert session['items'][0]['exercise']['onedrive_url'] == LINK
    body['onedrive_url'] = OTHER
    assert client.put(path, json=body).json()['onedrive_url'] == OTHER
    assert client.get(f"/api/sessions/{session['id']}").json()['items'][0]['exercise']['onedrive_url'] == LINK
    assert client.post(f"/api/sessions/{session['id']}/finish").status_code == 200
    next_session = start(client, profile, plan)
    assert next_session['items'][0]['exercise']['onedrive_url'] == OTHER


def test_link_and_uploaded_video_can_coexist(client):
    _, exercise, _ = setup_training(client)
    path = f"/api/exercises/{exercise['id']}"
    client.put(path + '/video', content=MP4, headers={'Content-Type': 'video/mp4'})
    body = {'name': exercise['name'], 'categories': exercise['categories'], 'onedrive_url': LINK}
    result = client.put(path, json=body).json()
    assert result['has_video'] and result['onedrive_url'] == LINK
    body['onedrive_url'] = ''
    assert client.put(path, json=body).json()['has_video']
    assert client.get(path + '/video').content == MP4


def test_old_database_migration_keeps_existing_data_and_is_repeatable(tmp_path):
    old_schema = SCHEMA.replace(" onedrive_url TEXT NOT NULL DEFAULT '',\n", '')
    with sqlite3.connect(tmp_path / 'training.sqlite') as conn:
        conn.executescript(old_schema)
        conn.execute("INSERT INTO profiles(name,color) VALUES ('Steffi','#d9f36a')")
        conn.execute('''INSERT INTO exercises(name,categories,muscles,equipment,notes,start_seconds,end_seconds,video)
            VALUES (?,?,?,?,?,?,?,?)''', ('Alt', '["Beine"]', 'Beine', 'Hantel', 'Bestehende Notiz', 2, None, 'old.mp4'))
    (tmp_path / 'videos').mkdir()
    (tmp_path / 'videos' / 'old.mp4').write_bytes(MP4)
    for _ in range(2):
        with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as client:
            exercise = client.get('/api/exercises').json()[0]
            assert exercise['onedrive_url'] == ''
            assert exercise['notes'] == 'Bestehende Notiz'
            assert exercise['has_video']
            assert client.get('/api/exercises/1/video').content == MP4
            assert client.get('/api/profiles').json()[0]['name'] == 'Steffi'


def test_historical_snapshot_without_new_field_remains_readable(tmp_path):
    with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as client:
        profile, _, plan = setup_training(client)
        session = start(client, profile, plan)
    with sqlite3.connect(tmp_path / 'training.sqlite') as conn:
        row = conn.execute('SELECT id,snapshot FROM session_items').fetchone()
        old = json.loads(row[1]); old.pop('onedrive_url')
        conn.execute('UPDATE session_items SET snapshot=? WHERE id=?', (json.dumps(old), row[0]))
    with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as client:
        assert client.get(f"/api/sessions/{session['id']}").json()['items'][0]['exercise']['onedrive_url'] == ''
