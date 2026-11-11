import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from helden_training.backend.app import create_app, SCHEMA
from tests.test_api import HEADERS, MP4, setup_training, start


@pytest.fixture
def env(tmp_path):
    media = tmp_path / 'media'
    (media / 'Beine').mkdir(parents=True)
    (media / 'Beine' / 'Kniebeuge.MOV').write_bytes(MP4 + b'first')
    (media / 'Beine' / 'Andere.mp4').write_bytes(MP4 + b'second')
    with TestClient(create_app(tmp_path / 'data', ingress_only=False, media_dir=media), headers=HEADERS) as client:
        yield client, media


def test_browse_lists_only_training_videos_and_folders(env):
    client, media = env
    (media / 'notes.txt').write_text('not a video')
    (media / '.private.mp4').write_bytes(MP4)
    listing = client.get('/api/local-media').json()
    assert listing['available']
    assert [item['name'] for item in listing['items']] == ['Beine']
    listing = client.get('/api/local-media', params={'folder': 'Beine'}).json()
    assert len(listing['items']) == 2
    assert all(item['kind'] == 'video' for item in listing['items'])
    assert listing['items'][1]['path'] == 'Beine/Kniebeuge.MOV'


def test_local_reference_plays_ranges_and_preserves_session_snapshot(env):
    client, media = env
    profile, exercise, plan = setup_training(client)
    path = f"/api/exercises/{exercise['id']}"
    body = {'name': exercise['name'], 'categories': exercise['categories'], 'media_path': 'Beine/Kniebeuge.MOV'}
    result = client.put(path, json=body)
    assert result.status_code == 200
    assert result.json()['has_video'] and not result.json()['has_uploaded_video']
    response = client.get(path + '/video', headers={'Range': 'bytes=0-7'})
    assert response.status_code == 206
    assert response.headers['content-type'] == 'video/quicktime'
    assert response.content == MP4[:8]
    assert client.head(path + '/video').headers['content-length'] == str(len(MP4 + b'first'))
    assert client.head(path + '/video').content == b''
    session = start(client, profile, plan)
    body['media_path'] = 'Beine/Andere.mp4'
    assert client.put(path, json=body).status_code == 200
    detail = client.get(f"/api/sessions/{session['id']}").json()
    assert detail['items'][0]['exercise']['media_path'] == 'Beine/Kniebeuge.MOV'
    video = f"/api/sessions/{session['id']}/items/{session['items'][0]['id']}/video"
    assert client.get(video).content == MP4 + b'first'
    # Merely referencing the mounted file must not copy it into app-owned uploads.
    export = client.get('/api/export').json()['tables']['exercises'][0]
    assert export['media_path'] == 'Beine/Andere.mp4'


@pytest.mark.parametrize('value', ['../secret.mp4', '/etc/secret.mp4', 'Beine/../secret.mp4', '.secret/movie.mp4', 'Beine\\Kniebeuge.MOV', 'Beine//Kniebeuge.MOV'])
def test_traversal_and_hidden_paths_are_rejected(env, value):
    client, _ = env
    assert client.get('/api/local-media', params={'folder': value}).status_code == 422
    assert client.post('/api/exercises', json={'name': 'X', 'categories': ['Push'], 'media_path': value}).status_code == 422


def test_symlink_outside_media_root_is_never_exposed(env, tmp_path):
    client, media = env
    secret = tmp_path / 'secret.mp4'
    secret.write_bytes(b'secret')
    (media / 'escape.mp4').symlink_to(secret)
    assert all(item['name'] != 'escape.mp4' for item in client.get('/api/local-media').json()['items'])
    assert client.post('/api/exercises', json={'name': 'X', 'categories': ['Push'], 'media_path': 'escape.mp4'}).status_code == 403


def test_missing_file_is_reported_and_reference_can_be_cleared(env):
    client, media = env
    exercise = client.post('/api/exercises', json={'name': 'X', 'categories': ['Push'], 'media_path': 'Beine/Kniebeuge.MOV'}).json()
    (media / 'Beine' / 'Kniebeuge.MOV').unlink()
    path = f"/api/exercises/{exercise['id']}"
    assert client.get(path + '/video').status_code == 404
    # Old clients and metadata edits do not destroy a temporarily unavailable reference.
    result = client.put(path, json={'name': 'Neu', 'categories': ['Push']}).json()
    assert result['media_path'] == 'Beine/Kniebeuge.MOV'
    assert client.put(path, json={'name': 'Neu', 'categories': ['Push'], 'media_path': ''}).json()['media_path'] == ''


def test_uploaded_video_is_retained_when_reference_is_removed(env):
    client, _ = env
    _, exercise, _ = setup_training(client)
    path = f"/api/exercises/{exercise['id']}"
    client.put(path + '/video', content=MP4, headers={'Content-Type': 'video/mp4'})
    body = {'name': exercise['name'], 'categories': exercise['categories'], 'media_path': 'Beine/Kniebeuge.MOV'}
    assert client.put(path, json=body).json()['has_uploaded_video']
    assert client.get(path + '/video').content == MP4 + b'first'
    body['media_path'] = ''
    assert client.put(path, json=body).json()['has_video']
    assert client.get(path + '/video').content == MP4


def test_unavailable_root_returns_setup_instructions(tmp_path):
    with TestClient(create_app(tmp_path / 'data', ingress_only=False, media_dir=tmp_path / 'absent'), headers=HEADERS) as client:
        assert client.get('/api/local-media').json()['available'] is False
        assert client.post('/api/exercises', json={'name': 'X', 'categories': ['Push'], 'media_path': 'movie.mov'}).status_code == 404


def test_migration_from_previous_version_keeps_data_and_is_repeatable(tmp_path):
    old_schema = SCHEMA.replace(" media_path TEXT NOT NULL DEFAULT '',\n", '')
    with sqlite3.connect(tmp_path / 'training.sqlite') as conn:
        conn.executescript(old_schema)
        conn.execute('''INSERT INTO exercises(name,categories,muscles,equipment,notes,start_seconds,onedrive_url)
            VALUES ('Alt','["Push"]','','','Notiz',0,'https://1drv.ms/v/example')''')
    for _ in range(2):
        with TestClient(create_app(tmp_path, ingress_only=False, media_dir=tmp_path / 'absent'), headers=HEADERS) as client:
            row = client.get('/api/exercises').json()[0]
            assert row['media_path'] == ''
            assert row['notes'] == 'Notiz'
            assert row['onedrive_url'] == 'https://1drv.ms/v/example'
