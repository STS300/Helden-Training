import subprocess
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from helden_training.backend.app import create_app
from tests.test_api import HEADERS


def test_thumbnail_cache_invalidates_on_file_or_excerpt_change(tmp_path):
    media = tmp_path / 'media'
    media.mkdir()
    source = media / 'test.mov'
    source.write_bytes(b'video')
    calls = []
    def extract(args, **kwargs):
        calls.append(args)
        Path(args[-1]).write_bytes(b'jpeg-still')
    with TestClient(create_app(tmp_path / 'data', ingress_only=False, media_dir=media), headers=HEADERS) as client, patch('helden_training.backend.thumbnails.subprocess.run', side_effect=extract):
        body = {'name': 'Test', 'categories': ['Beine'], 'media_path': 'test.mov', 'muscles': 'Quadrizeps, Gesäß'}
        exercise = client.post('/api/exercises', json=body).json()
        url = f"/api/exercises/{exercise['id']}"
        first = client.get(url + '/thumbnail')
        assert first.status_code == 200 and first.headers['content-type'] == 'image/jpeg'
        assert first.content == b'jpeg-still'
        client.get(url + '/thumbnail')
        assert len(calls) == 1
        assert '-ss' in calls[0] and calls[0][calls[0].index('-i')+1] == str(source)
        updated = client.put(url, json={**body, 'start_seconds': 4}).json()
        assert updated['thumbnail_version'] != exercise['thumbnail_version']
        client.get(url + '/thumbnail')
        assert len(calls) == 2 and calls[-1][calls[-1].index('-ss')+1] == '4.0'
        source.write_bytes(b'new, longer video')
        assert client.get('/api/exercises').json()[0]['thumbnail_version'] != updated['thumbnail_version']
        client.get(url + '/thumbnail')
        assert len(calls) == 3
        assert source.read_bytes() == b'new, longer video'
        source.unlink()
        assert client.get(url + '/thumbnail').status_code == 404


def test_thumbnail_failure_does_not_affect_exercise_or_remote_fetch(tmp_path):
    media = tmp_path / 'media'
    media.mkdir()
    (media / 'bad.mov').write_bytes(b'broken')
    with TestClient(create_app(tmp_path / 'data', ingress_only=False, media_dir=media), headers=HEADERS) as client, patch('helden_training.backend.thumbnails.subprocess.run', side_effect=subprocess.TimeoutExpired('ffmpeg',25)) as extract:
        body = {'name': 'Remote', 'categories': ['Beine'], 'onedrive_url': 'https://1drv.ms/v/example'}
        exercise = client.post('/api/exercises', json=body).json()
        url = f"/api/exercises/{exercise['id']}"
        assert client.get(url + '/thumbnail').status_code == 404
        extract.assert_not_called()
        assert client.put(url, json={**body, 'media_path': 'bad.mov'}).status_code == 200
        assert client.get(url + '/thumbnail').status_code == 422
        assert client.get('/api/exercises').status_code == 200
        assert not list((tmp_path / 'data' / 'thumbnails').glob('*.jpg'))


def test_real_hevc_still_when_ffmpeg_is_available(tmp_path):
    import shutil
    import pytest
    if not shutil.which('ffmpeg'):
        pytest.skip('FFmpeg integration check requires the container runtime or a local FFmpeg binary')
    from helden_training.backend.thumbnails import Thumbnails
    source = Path(__file__).parent / 'fixtures' / 'hevc-main10-12s.mov'
    image = Thumbnails(tmp_path).image(source, 2)
    result = Path(image.path).read_bytes()
    assert result[:2] == b'\xff\xd8' and len(result) > 1000
