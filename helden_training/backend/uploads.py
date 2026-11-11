"""Bounded, retryable uploads: each HTTP body stays below ingress/proxy limits."""
import logging
import os
import time
import uuid
from pathlib import Path

from fastapi import HTTPException, Query, Request
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from .media import MEDIA_TYPES, video_suffix

CHUNK_BYTES = 256 * 1024
UPLOAD_TTL = 24 * 60 * 60
LOGGER = logging.getLogger(__name__)
UPLOAD_SCHEMA = '''
CREATE TABLE IF NOT EXISTS video_uploads (
 id TEXT PRIMARY KEY, exercise_id INTEGER NOT NULL REFERENCES exercises(id),
 size INTEGER NOT NULL, media_type TEXT NOT NULL, offset INTEGER NOT NULL DEFAULT 0,
 updated_at REAL NOT NULL, completed INTEGER NOT NULL DEFAULT 0
);
'''


class UploadRequest(BaseModel):
    size: int = Field(gt=0)
    media_type: str


def register_uploads(app, db, data: Path, get, max_upload):
    folder = data / 'uploads'

    def find(conn, upload_id):
        row = conn.execute('SELECT * FROM video_uploads WHERE id=?', (upload_id,)).fetchone()
        if not row or row['updated_at'] < time.time() - UPLOAD_TTL:
            raise HTTPException(404, 'Upload abgelaufen. Bitte Datei erneut auswählen.')
        return dict(row)

    def status(row):
        return {key: row[key] for key in ('id', 'size', 'offset', 'completed')} | {'chunk_bytes': CHUNK_BYTES}

    def cleanup(conn):
        # Database lock is held while removing expired files, not while receiving data.
        for row in conn.execute('SELECT id FROM video_uploads WHERE updated_at<?', (time.time() - UPLOAD_TTL,)):
            (folder / (row['id'] + '.part')).unlink(missing_ok=True)
        conn.execute('DELETE FROM video_uploads WHERE updated_at<?', (time.time() - UPLOAD_TTL,))

    @app.post('/api/exercises/{exercise_id}/video-uploads', status_code=201)
    def begin(exercise_id: int, body: UploadRequest):
        if body.size > max_upload:
            raise HTTPException(413, 'Video überschreitet das Uploadlimit.')
        if body.media_type not in MEDIA_TYPES:
            raise HTTPException(415, 'Bitte eine MP4- oder MOV-Datei hochladen.')
        with db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            get(conn, 'exercises', exercise_id, True)
            cleanup(conn)
            upload_id = uuid.uuid4().hex
            conn.execute('INSERT INTO video_uploads(id,exercise_id,size,media_type,updated_at) VALUES (?,?,?,?,?)',
                         (upload_id, exercise_id, body.size, body.media_type, time.time()))
            folder.mkdir(exist_ok=True)
            (folder / (upload_id + '.part')).touch(exist_ok=False)
            return status(find(conn, upload_id))

    @app.get('/api/video-uploads/{upload_id}')
    def read_status(upload_id: str):
        with db() as conn:
            return status(find(conn, upload_id))

    def append(upload_id, offset, body):
        with db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            row = find(conn, upload_id)
            if row['completed']:
                return status(row)
            get(conn, 'exercises', row['exercise_id'], True)
            if offset > row['offset'] or offset + len(body) > row['size']:
                raise HTTPException(409, 'Upload-Position stimmt nicht überein. Erneut versuchen.')
            partial = folder / (upload_id + '.part')
            if not partial.is_file() or partial.stat().st_size < row['offset']:
                raise HTTPException(409, 'Upload-Datei fehlt. Bitte Datei erneut auswählen.')
            with partial.open('r+b') as target:
                target.seek(offset)
                if offset < row['offset']:
                    # A response may have been lost after the bytes were committed.
                    if offset + len(body) > row['offset'] or target.read(len(body)) != body:
                        raise HTTPException(409, 'Wiederholter Datenblock stimmt nicht überein.')
                    return status(row)
                # Ignore a tail left by a previous process that failed before DB commit.
                target.truncate(offset)
                target.write(body)
                target.flush()
                os.fsync(target.fileno())
            conn.execute('UPDATE video_uploads SET offset=?,updated_at=? WHERE id=?',
                         (offset + len(body), time.time(), upload_id))
            return status(find(conn, upload_id))

    @app.put('/api/video-uploads/{upload_id}')
    async def put_chunk(upload_id: str, request: Request, offset: int = Query(ge=0)):
        # Validate before reading, then recheck under the write lock.
        with db() as conn:
            find(conn, upload_id)
        body = bytearray()
        async for chunk in request.stream():
            if len(body) + len(chunk) > CHUNK_BYTES:
                raise HTTPException(413, 'Datenblock ist zu groß. Bitte Oberfläche neu laden.')
            body.extend(chunk)
        if not body:
            raise HTTPException(422, 'Leerer Datenblock.')
        return await run_in_threadpool(append, upload_id, offset, bytes(body))

    @app.post('/api/video-uploads/{upload_id}/finish')
    def finish(upload_id: str):
        partial = None
        final = None
        linked = False
        try:
            with db() as conn:
                conn.execute('BEGIN IMMEDIATE')
                row = find(conn, upload_id)
                if row['completed']:
                    return status(row)
                get(conn, 'exercises', row['exercise_id'], True)
                if row['offset'] != row['size']:
                    raise HTTPException(409, 'Das Video ist noch nicht vollständig übertragen.')
                partial = folder / (upload_id + '.part')
                if not partial.is_file() or partial.stat().st_size < row['size']:
                    raise HTTPException(409, 'Upload-Datei ist unvollständig. Bitte erneut auswählen.')
                with partial.open('r+b') as source:
                    source.truncate(row['size'])
                    suffix = video_suffix(source.read(32), row['size'], row['media_type'])
                final = data / 'videos' / (upload_id + suffix)
                # Keep the confirmed partial until the database commit is durable.
                # Both directories are on /data: a hard link is constant-time and
                # survives a process exit between file publication and DB commit.
                if final.exists():
                    if not os.path.samefile(partial, final):
                        raise HTTPException(409, 'Upload-Datei stimmt nicht überein.')
                else:
                    os.link(partial, final)
                    linked = True
                conn.execute('UPDATE exercises SET video=? WHERE id=?', (final.name, row['exercise_id']))
                conn.execute('UPDATE video_uploads SET completed=1,updated_at=? WHERE id=?', (time.time(), upload_id))
                result = status(find(conn, upload_id))
            linked = False  # Database commit succeeded; the final file is now authoritative.
            partial.unlink(missing_ok=True)
            LOGGER.info('Video upload completed: %s (%d bytes)', upload_id, row['size'])
            return result
        except BaseException:
            if linked and final:
                final.unlink(missing_ok=True)
            raise
