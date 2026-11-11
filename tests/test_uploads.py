from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from helden_training.backend.app import create_app
from helden_training.backend.uploads import CHUNK_BYTES
from tests.test_api import HEADERS, MP4, setup_training, start

MOV = b'\x00\x00\x00\x18ftypqt  \x00\x00\x00\x00qt  \x00\x00\x00\x00'


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as client:
        yield client


def begin(client, exercise, size, media_type='video/quicktime'):
    result = client.post(f"/api/exercises/{exercise['id']}/video-uploads", json={'size': size, 'media_type': media_type})
    assert result.status_code == 201, result.text
    return result.json()


def send(client, upload, offset, body):
    return client.put(f"/api/video-uploads/{upload['id']}?offset={offset}", content=body,
                      headers={'Content-Type': 'application/octet-stream'})


def finish(client, upload):
    return client.post(f"/api/video-uploads/{upload['id']}/finish")


def test_large_mov_is_split_into_bounded_requests_and_preserves_bytes(client):
    profile, exercise, plan = setup_training(client)
    # Larger than the reported 16 MiB ingress limit; only small requests are sent.
    video = MOV + b'hevc-payload' * (17 * 1024 * 1024 // 12)
    upload = begin(client, exercise, len(video))
    for offset in range(0, len(video), CHUNK_BYTES):
        chunk = video[offset:offset + CHUNK_BYTES]
        result = send(client, upload, offset, chunk)
        assert result.status_code == 200, result.text
        assert result.json()['offset'] == offset + len(chunk)
    assert finish(client, upload).json()['completed'] == 1
    assert finish(client, upload).json()['completed'] == 1
    path = f"/api/exercises/{exercise['id']}/video"
    result = client.get(path)
    assert result.content == video
    assert result.headers['content-type'] == 'video/quicktime'
    session = start(client, profile, plan)
    item = session['items'][0]
    assert client.get(f"/api/sessions/{session['id']}/items/{item['id']}/video").content == video


def test_lost_response_retry_is_idempotent(client):
    _, exercise, _ = setup_training(client)
    video = MOV + b'x' * 1024
    upload = begin(client, exercise, len(video))
    first = send(client, upload, 0, video[:256])
    assert first.json()['offset'] == 256
    assert send(client, upload, 0, video[:256]).json()['offset'] == 256
    assert send(client, upload, 0, b'z' * 256).status_code == 409
    assert send(client, upload, 256, video[256:]).status_code == 200
    assert finish(client, upload).status_code == 200
    assert client.get(f"/api/exercises/{exercise['id']}/video").content == video


def test_resume_after_restart_and_uncommitted_disk_tail(tmp_path):
    with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as client:
        _, exercise, _ = setup_training(client)
        video = MOV + b'x' * 2000
        upload = begin(client, exercise, len(video))
        assert send(client, upload, 0, video[:1000]).status_code == 200
    partial = tmp_path / 'uploads' / (upload['id'] + '.part')
    with partial.open('ab') as f:
        f.write(b'uncommitted bytes')
    with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as client:
        assert client.get(f"/api/video-uploads/{upload['id']}").json()['offset'] == 1000
        assert partial.is_file()
        assert send(client, upload, 1000, video[1000:]).status_code == 200
        assert finish(client, upload).status_code == 200
        assert client.get(f"/api/exercises/{exercise['id']}/video").content == video


def test_chunk_and_total_size_limits(client):
    _, exercise, _ = setup_training(client)
    assert client.post(f"/api/exercises/{exercise['id']}/video-uploads", json={'size': 513 * 1024 * 1024, 'media_type': 'video/quicktime'}).status_code == 413
    assert client.post(f"/api/exercises/{exercise['id']}/video-uploads", json={'size': 0, 'media_type': 'video/quicktime'}).status_code == 422
    assert client.post(f"/api/exercises/{exercise['id']}/video-uploads", json={'size': 100, 'media_type': 'text/html'}).status_code == 415
    upload = begin(client, exercise, CHUNK_BYTES * 2)
    assert send(client, upload, 0, b'x' * (CHUNK_BYTES + 1)).status_code == 413
    assert send(client, upload, 0, b'').status_code == 422
    assert send(client, upload, -1, MOV).status_code == 422
    assert send(client, upload, 1, MOV).status_code == 409
    assert client.get(f"/api/video-uploads/{upload['id']}").json()['offset'] == 0
    assert finish(client, upload).status_code == 409


def test_failed_or_incomplete_upload_does_not_replace_existing_video(client):
    _, exercise, _ = setup_training(client)
    path = f"/api/exercises/{exercise['id']}/video"
    client.put(path, content=MP4, headers={'Content-Type': 'video/mp4'})
    upload = begin(client, exercise, 32)
    assert send(client, upload, 0, b'not-a-video' * 2).status_code == 200
    assert finish(client, upload).status_code == 409
    assert client.get(path).content == MP4
    bad = begin(client, exercise, 32)
    assert send(client, bad, 0, b'x' * 32).status_code == 200
    assert finish(client, bad).status_code == 415
    assert client.get(path).content == MP4


def test_parallel_duplicate_chunks_are_not_appended_twice(client):
    _, exercise, _ = setup_training(client)
    upload = begin(client, exercise, len(MOV))
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: send(client, upload, 0, MOV).json()['offset'], range(2)))
    assert results == [len(MOV), len(MOV)]
    assert finish(client, upload).status_code == 200
    assert client.get(f"/api/exercises/{exercise['id']}/video").content == MOV


def test_upload_to_archived_exercise_and_path_traversal_are_rejected(client):
    _, exercise, _ = setup_training(client)
    upload = begin(client, exercise, len(MOV))
    client.delete(f"/api/exercises/{exercise['id']}")
    assert send(client, upload, 0, MOV).status_code == 404
    assert finish(client, upload).status_code == 404
    assert client.get('/api/video-uploads/not-a-valid-id').status_code == 404


def test_real_twelve_second_hevc_main10_mov_upload(client):
    from pathlib import Path
    video = (Path(__file__).parent / 'fixtures' / 'hevc-main10-12s.mov').read_bytes()
    assert b'hvc1' in video and video[8:12] == b'qt  '
    _, exercise, _ = setup_training(client)
    upload = begin(client, exercise, len(video))
    for offset in range(0, len(video), CHUNK_BYTES):
        assert send(client, upload, offset, video[offset:offset + CHUNK_BYTES]).status_code == 200
    assert finish(client, upload).status_code == 200
    assert client.get(f"/api/exercises/{exercise['id']}/video").content == video


def test_finish_recovers_file_published_before_database_commit(tmp_path):
    import os
    with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as client:
        _, exercise, _ = setup_training(client)
        upload = begin(client, exercise, len(MOV))
        assert send(client, upload, 0, MOV).status_code == 200
        partial = tmp_path / 'uploads' / (upload['id'] + '.part')
        final = tmp_path / 'videos' / (upload['id'] + '.mov')
        # Simulate a process exit just before the final database transaction committed.
        os.link(partial, final)
    with TestClient(create_app(tmp_path, ingress_only=False), headers=HEADERS) as client:
        assert finish(client, upload).json()['completed'] == 1
        assert not partial.exists()
        assert client.get(f"/api/exercises/{exercise['id']}/video").content == MOV
