"""Bounded, local-only video still extraction. Source videos remain untouched."""
import hashlib
import subprocess
import threading
import uuid
from pathlib import Path
from fastapi import HTTPException
from fastapi.responses import FileResponse


class Thumbnails:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.lock = threading.Lock()

    def image(self, source, seconds=0):
        source = Path(source)
        try:
            stat = source.stat()
        except OSError:
            raise HTTPException(404, 'Videodatei nicht verfügbar.') from None
        key = hashlib.sha256(f'{source}:{stat.st_size}:{stat.st_mtime_ns}:{seconds}'.encode()).hexdigest()
        destination = self.directory / f'{key}.jpg'
        # Serialize extraction to avoid exhausting small Home Assistant hosts.
        with self.lock:
            if not destination.is_file():
                self.directory.mkdir(parents=True, exist_ok=True)
                temporary = self.directory / f'{uuid.uuid4().hex}.jpg'
                try:
                    subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error',
                                    '-protocol_whitelist', 'file,pipe', '-threads', '1', '-ss', str(seconds), '-i', str(source),
                                    '-frames:v', '1', '-vf', 'scale=640:640:force_original_aspect_ratio=decrease',
                                    '-threads', '1', '-q:v', '4', '-y', str(temporary)],
                                   stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                   stderr=subprocess.DEVNULL, timeout=25, check=True)
                    if not temporary.is_file() or not temporary.stat().st_size:
                        raise HTTPException(422, 'Kein Standbild im gewählten Videoausschnitt verfügbar.')
                    temporary.replace(destination)
                    # Derived cache only: keep at most 200 images, excluding this response.
                    stale = sorted((p for p in self.directory.glob('*.jpg') if p != destination), key=lambda p: p.stat().st_mtime, reverse=True)
                    for path in stale[199:]:
                        path.unlink(missing_ok=True)
                except (OSError, subprocess.SubprocessError):
                    raise HTTPException(422, 'Standbild konnte nicht erstellt werden.') from None
                finally:
                    temporary.unlink(missing_ok=True)
        return FileResponse(destination, media_type='image/jpeg')
