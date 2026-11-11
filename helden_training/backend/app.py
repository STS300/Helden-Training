"""Local-first training API. Production access is restricted to HA Ingress."""
import json
import os
import sqlite3
import uuid
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, model_validator, field_validator

from .media import MEDIA_TYPES, video_suffix
from .uploads import UPLOAD_SCHEMA, register_uploads

CATEGORIES = ['Ganzer Körper', 'Oberkörper', 'Unterkörper', 'Beine', 'Push', 'Pull']


def now():
    return datetime.now(timezone.utc).isoformat()


class Profile(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    color: str = Field(default='#d9f36a', pattern=r'^#[0-9a-fA-F]{6}$')


class Exercise(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    categories: List[str] = Field(min_length=1, max_length=6)
    muscles: str = Field(default='', max_length=300)
    equipment: str = Field(default='', max_length=200)
    notes: str = Field(default='', max_length=2000)
    start_seconds: float = Field(default=0, ge=0, le=86400)
    end_seconds: Optional[float] = Field(default=None, gt=0, le=86400)
    onedrive_url: str = Field(default='', max_length=4096)

    @field_validator('onedrive_url')
    @classmethod
    def validate_onedrive_url(cls, value):
        value = value.strip()
        if not value:
            return ''
        try:
            parsed = urlsplit(value)
            valid = (parsed.scheme == 'https' and parsed.hostname in ('1drv.ms', 'onedrive.live.com')
                     and parsed.username is None and parsed.password is None and parsed.port in (None, 443)
                     and not any(ord(char) < 32 or char.isspace() for char in value)
                     and '\\' not in value)
        except ValueError:
            valid = False
        if not valid:
            raise ValueError('Bitte einen HTTPS-Freigabelink von 1drv.ms oder onedrive.live.com verwenden.')
        return value

    @model_validator(mode='after')
    def validate_categories(self):
        if any(c not in CATEGORIES for c in self.categories):
            raise ValueError('Unbekannte Trainingskategorie')
        if self.end_seconds is not None and self.end_seconds <= self.start_seconds:
            raise ValueError('Endzeit muss nach der Startzeit liegen')
        return self


class PlanItem(BaseModel):
    exercise_id: int = Field(gt=0)
    sets: int = Field(default=3, ge=1, le=20)
    reps: int = Field(default=10, ge=1, le=200)
    rest_seconds: int = Field(default=90, ge=0, le=1800)
    weight: float = Field(default=0, ge=0, le=2000)


class Plan(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str
    items: List[PlanItem] = Field(min_length=1, max_length=60)


class StartSession(BaseModel):
    profile_id: int = Field(gt=0)
    plan_id: int = Field(gt=0)


class SetLog(BaseModel):
    weight: float = Field(ge=0, le=2000)
    reps: int = Field(ge=1, le=200)
    notes: str = Field(default='', max_length=1000)


class Skip(BaseModel):
    skipped: bool


SCHEMA = '''
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS profiles (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS exercises (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL, categories TEXT NOT NULL,
 muscles TEXT NOT NULL, equipment TEXT NOT NULL, notes TEXT NOT NULL,
 start_seconds REAL NOT NULL, end_seconds REAL, video TEXT,
 onedrive_url TEXT NOT NULL DEFAULT '',
 archived INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS plans (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS plan_items (
 id INTEGER PRIMARY KEY, plan_id INTEGER NOT NULL REFERENCES plans(id),
 exercise_id INTEGER NOT NULL REFERENCES exercises(id), position INTEGER NOT NULL,
 sets INTEGER NOT NULL, reps INTEGER NOT NULL, rest_seconds INTEGER NOT NULL, weight REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 id INTEGER PRIMARY KEY, profile_id INTEGER NOT NULL REFERENCES profiles(id),
 plan_name TEXT NOT NULL, category TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_session ON sessions(profile_id) WHERE finished_at IS NULL;
CREATE TABLE IF NOT EXISTS session_items (
 id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions(id),
 exercise_id INTEGER NOT NULL, position INTEGER NOT NULL, snapshot TEXT NOT NULL,
 sets INTEGER NOT NULL, reps INTEGER NOT NULL, rest_seconds INTEGER NOT NULL,
 weight REAL NOT NULL, skipped INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS set_logs (
 id INTEGER PRIMARY KEY, item_id INTEGER NOT NULL REFERENCES session_items(id),
 set_index INTEGER NOT NULL, weight REAL NOT NULL, reps INTEGER NOT NULL,
 notes TEXT NOT NULL, saved_at TEXT NOT NULL, UNIQUE(item_id, set_index)
);
PRAGMA user_version=1;
'''


def create_app(data_dir=None, static_dir=None, ingress_only=None):
    data = Path(data_dir or os.getenv('DATA_DIR', './data'))
    static = Path(static_dir or Path(__file__).parent.parent / 'frontend' / 'dist')
    restricted = ingress_only if ingress_only is not None else os.getenv('INGRESS_ONLY', 'true').lower() == 'true'
    max_upload = int(os.getenv('MAX_UPLOAD_MB', '512')) * 1024 * 1024

    @contextmanager
    def db():
        conn = sqlite3.connect(str(data / 'training.sqlite'), timeout=20)
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA foreign_keys=ON')
        try:
            with conn:
                yield conn
        finally:
            conn.close()

    @asynccontextmanager
    async def lifespan(app):
        data.mkdir(parents=True, exist_ok=True)
        (data / 'videos').mkdir(exist_ok=True)
        with db() as conn:
            conn.executescript(SCHEMA + UPLOAD_SCHEMA)
            # Additive migration: keep every existing exercise, video and session.
            columns = {row['name'] for row in conn.execute('PRAGMA table_info(exercises)')}
            if 'onedrive_url' not in columns:
                conn.execute("ALTER TABLE exercises ADD COLUMN onedrive_url TEXT NOT NULL DEFAULT ''")
            conn.execute('PRAGMA user_version=2')
        (data / 'uploads').mkdir(exist_ok=True)
        # Remove partial uploads left by a power interruption, never finished videos.
        for partial in (data / 'videos').glob('*.part'):
            partial.unlink(missing_ok=True)
        yield

    app = FastAPI(title='Helden-Training', version='0.1.4', lifespan=lifespan,
                  docs_url=None, redoc_url=None, openapi_url=None)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # Do not serialize raw NaN/Infinity or exception objects from validation input.
        return JSONResponse({'detail': 'Bitte Eingaben prüfen.', 'errors': [
            {'loc': error['loc'], 'msg': error['msg']} for error in exc.errors()]}, status_code=422)

    @app.middleware('http')
    async def guard(request: Request, call_next):
        if restricted and (not request.client or request.client.host != '172.30.32.2'):
            return JSONResponse({'detail': 'Zugriff nur über Home Assistant Ingress.'}, status_code=403)
        # State changes must originate from the same origin. Ingress may rewrite Host.
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            if request.headers.get('sec-fetch-site') == 'cross-site':
                return JSONResponse({'detail': 'Fremder Ursprung abgelehnt.'}, status_code=403)
            if request.headers.get('x-helden-request') != '1':
                return JSONResponse({'detail': 'Anfragekennung fehlt.'}, status_code=403)
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'same-origin'
        response.headers['Cache-Control'] = 'no-store'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'"
        return response

    def get(conn, table, identifier, active=False):
        # Table names are internal constants, never user input.
        row = conn.execute(f'SELECT * FROM {table} WHERE id=?' + (' AND archived=0' if active else ''), (identifier,)).fetchone()
        if not row:
            raise HTTPException(404, 'Eintrag nicht gefunden.')
        return dict(row)

    def exercise_dict(row):
        result = dict(row)
        result['categories'] = json.loads(result['categories'])
        result['has_video'] = bool(result.pop('video'))
        return result

    def session_detail(conn, identifier):
        result = get(conn, 'sessions', identifier)
        items = []
        for row in conn.execute('SELECT * FROM session_items WHERE session_id=? ORDER BY position', (identifier,)):
            item = dict(row)
            item['exercise'] = json.loads(item.pop('snapshot'))
            item['exercise'].setdefault('onedrive_url', '')
            item['logs'] = [dict(r) for r in conn.execute('SELECT * FROM set_logs WHERE item_id=? ORDER BY set_index', (item['id'],))]
            previous = conn.execute('''SELECT l.weight, l.reps, l.set_index, s.id AS source_session FROM set_logs l
                JOIN session_items i ON i.id=l.item_id JOIN sessions s ON s.id=i.session_id
                WHERE s.profile_id=? AND i.exercise_id=? AND s.id!=? AND s.finished_at IS NOT NULL
                ORDER BY s.id DESC, l.set_index ASC''', (result['profile_id'], item['exercise_id'], identifier)).fetchall()
            # Only use the latest session that actually contains logged sets for this exercise.
            last = {}
            for log in previous:
                if log['source_session'] == previous[0]['source_session']:
                    last.setdefault(log['set_index'], dict(log))
            item['previous'] = last
            items.append(item)
        result['items'] = items
        return result

    def editable_item(conn, session_id, item_id):
        session = get(conn, 'sessions', session_id)
        if session['finished_at']:
            raise HTTPException(409, 'Abgeschlossenes Training kann nicht geändert werden.')
        item = get(conn, 'session_items', item_id)
        if item['session_id'] != session_id:
            raise HTTPException(404, 'Übung gehört nicht zu dieser Session.')
        return item

    @app.get('/api/health')
    def health():
        return {'status': 'ok', 'version': '0.1.4'}

    @app.get('/api/categories')
    def categories():
        return CATEGORIES

    @app.get('/api/profiles')
    def profiles():
        with db() as conn:
            return [dict(r) for r in conn.execute('SELECT * FROM profiles WHERE archived=0 ORDER BY id')]

    @app.post('/api/profiles', status_code=201)
    def create_profile(body: Profile):
        if not body.name.strip():
            raise HTTPException(422, 'Name darf nicht leer sein.')
        with db() as conn:
            identifier = conn.execute('INSERT INTO profiles(name,color) VALUES (?,?)', (body.name.strip(), body.color)).lastrowid
            return get(conn, 'profiles', identifier)

    @app.put('/api/profiles/{identifier}')
    def update_profile(identifier: int, body: Profile):
        if not body.name.strip():
            raise HTTPException(422, 'Name darf nicht leer sein.')
        with db() as conn:
            get(conn, 'profiles', identifier, True)
            conn.execute('UPDATE profiles SET name=?,color=? WHERE id=?', (body.name.strip(), body.color, identifier))
            return get(conn, 'profiles', identifier)

    @app.delete('/api/profiles/{identifier}', status_code=204)
    def archive_profile(identifier: int):
        with db() as conn:
            get(conn, 'profiles', identifier, True)
            if conn.execute('SELECT id FROM sessions WHERE profile_id=? AND finished_at IS NULL', (identifier,)).fetchone():
                raise HTTPException(409, 'Bitte zuerst das aktive Training abschließen.')
            conn.execute('UPDATE profiles SET archived=1 WHERE id=?', (identifier,))

    @app.get('/api/exercises')
    def exercises():
        with db() as conn:
            return [exercise_dict(r) for r in conn.execute('SELECT * FROM exercises WHERE archived=0 ORDER BY name COLLATE NOCASE')]

    def save_exercise(conn, body, identifier=None):
        if not body.name.strip():
            raise HTTPException(422, 'Name darf nicht leer sein.')
        link = body.onedrive_url
        if identifier is not None and 'onedrive_url' not in body.model_fields_set:
            link = get(conn, 'exercises', identifier, True)['onedrive_url']
        values = (body.name.strip(), json.dumps(body.categories), body.muscles, body.equipment, body.notes, body.start_seconds, body.end_seconds, link)
        if identifier is None:
            identifier = conn.execute('''INSERT INTO exercises(name,categories,muscles,equipment,notes,start_seconds,end_seconds,onedrive_url)
                VALUES (?,?,?,?,?,?,?,?)''', values).lastrowid
        else:
            get(conn, 'exercises', identifier, True)
            conn.execute('UPDATE exercises SET name=?,categories=?,muscles=?,equipment=?,notes=?,start_seconds=?,end_seconds=?,onedrive_url=? WHERE id=?', values + (identifier,))
        return exercise_dict(get(conn, 'exercises', identifier))

    @app.post('/api/exercises', status_code=201)
    def create_exercise(body: Exercise):
        with db() as conn:
            return save_exercise(conn, body)

    @app.put('/api/exercises/{identifier}')
    def update_exercise(identifier: int, body: Exercise):
        with db() as conn:
            return save_exercise(conn, body, identifier)

    @app.delete('/api/exercises/{identifier}', status_code=204)
    def archive_exercise(identifier: int):
        with db() as conn:
            get(conn, 'exercises', identifier, True)
            conn.execute('UPDATE exercises SET archived=1 WHERE id=?', (identifier,))

    @app.put('/api/exercises/{identifier}/video')
    async def upload_video(identifier: int, request: Request):
        with db() as conn:
            get(conn, 'exercises', identifier, True)
        content_type = request.headers.get('content-type', '').split(';')[0].strip().lower()
        if content_type not in MEDIA_TYPES:
            raise HTTPException(415, 'Bitte eine MP4- oder MOV-Datei hochladen.')
        if int(request.headers.get('content-length') or 0) > max_upload:
            raise HTTPException(413, 'Video überschreitet das Uploadlimit.')
        filename = uuid.uuid4().hex + '.mp4'
        partial = data / 'videos' / (filename + '.part')
        final = data / 'videos' / filename
        size = 0
        header = bytearray()
        try:
            with partial.open('wb') as target:
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > max_upload:
                        raise HTTPException(413, 'Video überschreitet das Uploadlimit.')
                    if len(header) < 32:
                        header.extend(chunk[:32 - len(header)])
                    target.write(chunk)
            filename = final.stem + video_suffix(header, size, content_type)
            final = data / 'videos' / filename
            partial.rename(final)
            with db() as conn:
                # Recheck after streaming: the exercise might have been archived meanwhile.
                get(conn, 'exercises', identifier, True)
                conn.execute('UPDATE exercises SET video=? WHERE id=?', (filename, identifier))
            # Old videos remain for immutable session snapshots and HA backups.
            return {'has_video': True, 'bytes': size}
        except BaseException:
            partial.unlink(missing_ok=True)
            final.unlink(missing_ok=True)
            raise

    @app.get('/api/exercises/{identifier}/video')
    def exercise_video(identifier: int):
        with db() as conn:
            exercise = get(conn, 'exercises', identifier)
        if not exercise['video'] or not (data / 'videos' / exercise['video']).is_file():
            raise HTTPException(404, 'Kein Video vorhanden.')
        return FileResponse(data / 'videos' / exercise['video'], media_type='video/quicktime' if Path(exercise['video']).suffix == '.mov' else 'video/mp4')

    @app.get('/api/sessions/{session_id}/items/{item_id}/video')
    def session_video(session_id: int, item_id: int):
        with db() as conn:
            item = get(conn, 'session_items', item_id)
        if item['session_id'] != session_id:
            raise HTTPException(404)
        filename = json.loads(item['snapshot']).get('video')
        if not filename or not (data / 'videos' / filename).is_file():
            raise HTTPException(404, 'Kein Video vorhanden.')
        return FileResponse(data / 'videos' / filename, media_type='video/quicktime' if Path(filename).suffix == '.mov' else 'video/mp4')

    def plan_detail(conn, identifier):
        plan = get(conn, 'plans', identifier)
        plan['items'] = [dict(r) for r in conn.execute('''SELECT i.*, e.name AS exercise_name, e.archived AS exercise_archived
            FROM plan_items i JOIN exercises e ON e.id=i.exercise_id WHERE plan_id=? ORDER BY position''', (identifier,))]
        return plan

    @app.get('/api/plans')
    def plans():
        with db() as conn:
            return [plan_detail(conn, row['id']) for row in conn.execute('SELECT id FROM plans WHERE archived=0 ORDER BY id DESC')]

    def save_plan(conn, body, identifier=None):
        if body.category not in CATEGORIES or not body.name.strip():
            raise HTTPException(422, 'Name oder Kategorie ungültig.')
        for item in body.items:
            get(conn, 'exercises', item.exercise_id, True)
        if identifier is None:
            identifier = conn.execute('INSERT INTO plans(name,category) VALUES (?,?)', (body.name.strip(), body.category)).lastrowid
        else:
            get(conn, 'plans', identifier, True)
            conn.execute('UPDATE plans SET name=?,category=? WHERE id=?', (body.name.strip(), body.category, identifier))
            conn.execute('DELETE FROM plan_items WHERE plan_id=?', (identifier,))
        for position, item in enumerate(body.items):
            conn.execute('INSERT INTO plan_items(plan_id,exercise_id,position,sets,reps,rest_seconds,weight) VALUES (?,?,?,?,?,?,?)',
                         (identifier, item.exercise_id, position, item.sets, item.reps, item.rest_seconds, item.weight))
        return plan_detail(conn, identifier)

    @app.post('/api/plans', status_code=201)
    def create_plan(body: Plan):
        with db() as conn:
            return save_plan(conn, body)

    @app.put('/api/plans/{identifier}')
    def update_plan(identifier: int, body: Plan):
        with db() as conn:
            return save_plan(conn, body, identifier)

    @app.delete('/api/plans/{identifier}', status_code=204)
    def archive_plan(identifier: int):
        with db() as conn:
            get(conn, 'plans', identifier, True)
            conn.execute('UPDATE plans SET archived=1 WHERE id=?', (identifier,))

    @app.get('/api/sessions')
    def sessions(profile_id: int):
        with db() as conn:
            get(conn, 'profiles', profile_id)
            return [dict(r) for r in conn.execute('''SELECT s.*, COUNT(l.id) AS logged_sets,
                COALESCE(SUM(l.weight*l.reps),0) AS volume
                FROM sessions s LEFT JOIN session_items i ON i.session_id=s.id
                LEFT JOIN set_logs l ON l.item_id=i.id WHERE s.profile_id=? GROUP BY s.id ORDER BY s.id DESC''', (profile_id,))]

    @app.post('/api/sessions', status_code=201)
    def start_session(body: StartSession):
        with db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            get(conn, 'profiles', body.profile_id, True)
            plan = get(conn, 'plans', body.plan_id, True)
            if conn.execute('SELECT id FROM sessions WHERE profile_id=? AND finished_at IS NULL', (body.profile_id,)).fetchone():
                raise HTTPException(409, 'Dieses Profil hat bereits ein aktives Training. Bitte fortsetzen.')
            items = conn.execute('SELECT * FROM plan_items WHERE plan_id=? ORDER BY position', (body.plan_id,)).fetchall()
            if not items:
                raise HTTPException(422, 'Der Plan enthält keine Übungen.')
            identifier = conn.execute('INSERT INTO sessions(profile_id,plan_name,category,started_at) VALUES (?,?,?,?)',
                                      (body.profile_id, plan['name'], plan['category'], now())).lastrowid
            for item in items:
                exercise = get(conn, 'exercises', item['exercise_id'], True)
                exercise['categories'] = json.loads(exercise['categories'])
                conn.execute('''INSERT INTO session_items(session_id,exercise_id,position,snapshot,sets,reps,rest_seconds,weight)
                    VALUES (?,?,?,?,?,?,?,?)''', (identifier, exercise['id'], item['position'], json.dumps(exercise), item['sets'], item['reps'], item['rest_seconds'], item['weight']))
            return session_detail(conn, identifier)

    @app.get('/api/sessions/{identifier}')
    def read_session(identifier: int):
        with db() as conn:
            return session_detail(conn, identifier)

    @app.put('/api/sessions/{session_id}/items/{item_id}/sets/{set_index}')
    def log_set(session_id: int, item_id: int, set_index: int, body: SetLog):
        with db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            item = editable_item(conn, session_id, item_id)
            if not 1 <= set_index <= item['sets'] or item['skipped']:
                raise HTTPException(422, 'Satznummer ungültig oder Übung übersprungen.')
            conn.execute('''INSERT INTO set_logs(item_id,set_index,weight,reps,notes,saved_at) VALUES (?,?,?,?,?,?)
                ON CONFLICT(item_id,set_index) DO UPDATE SET weight=excluded.weight,reps=excluded.reps,
                notes=excluded.notes,saved_at=excluded.saved_at''', (item_id, set_index, body.weight, body.reps, body.notes, now()))
            return session_detail(conn, session_id)

    @app.put('/api/sessions/{session_id}/items/{item_id}/skip')
    def skip_item(session_id: int, item_id: int, body: Skip):
        with db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            editable_item(conn, session_id, item_id)
            conn.execute('UPDATE session_items SET skipped=? WHERE id=?', (body.skipped, item_id))
            return session_detail(conn, session_id)

    @app.post('/api/sessions/{identifier}/finish')
    def finish_session(identifier: int):
        with db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            session = get(conn, 'sessions', identifier)
            if not session['finished_at']:
                conn.execute('UPDATE sessions SET finished_at=? WHERE id=?', (now(), identifier))
            return session_detail(conn, identifier)

    @app.get('/api/export')
    def export():
        with db() as conn:
            conn.execute('BEGIN')
            tables = {table: [dict(r) for r in conn.execute(f'SELECT * FROM {table}')] for table in
                      ('profiles', 'exercises', 'plans', 'plan_items', 'sessions', 'session_items', 'set_logs')}
        return JSONResponse({'format_version': 1, 'exported_at': now(), 'tables': tables},
                            headers={'Content-Disposition': 'attachment; filename="helden-training-daten.json"'})

    register_uploads(app, db, data, get, max_upload)

    if (static / 'assets').is_dir():
        app.mount('/assets', StaticFiles(directory=static / 'assets'), name='assets')

    @app.get('/')
    def index():
        if not (static / 'index.html').exists():
            raise HTTPException(503, 'Frontend zuerst mit npm run build bauen.')
        return FileResponse(static / 'index.html')

    return app


app = create_app()
