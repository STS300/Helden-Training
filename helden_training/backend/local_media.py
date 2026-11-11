"""Read-only access to the dedicated Home Assistant training media directory."""
import os
from pathlib import Path, PurePosixPath

from fastapi import HTTPException
from fastapi.responses import FileResponse

TYPES = {'.mp4': 'video/mp4', '.mov': 'video/quicktime', '.m4v': 'video/mp4', '.webm': 'video/webm'}


class LocalMedia:
    def __init__(self, root):
        self.root = Path(root)

    @staticmethod
    def relative(value):
        if not value:
            return ''
        if (value.startswith('/') or '\\' in value or any(ord(c) < 32 for c in value)
                or any(part in ('', '.', '..') or part.startswith('.') for part in value.split('/'))):
            raise HTTPException(422, 'Nur relative Pfade innerhalb des Trainings-Medienordners verwenden.')
        return PurePosixPath(value).as_posix()

    def resolve(self, value, directory=False):
        value = self.relative(value)
        if not self.root.is_dir():
            raise HTTPException(404, 'Der Trainings-Medienordner ist noch nicht verfügbar. /media/helden-training anlegen und Videos hineinkopieren.')
        try:
            root = self.root.resolve(strict=True)
            target = (root / value).resolve(strict=True)
            if not target.is_relative_to(root):
                raise HTTPException(403, 'Datei liegt außerhalb des Trainings-Medienordners.')
            if directory:
                if not target.is_dir():
                    raise HTTPException(404, 'Medienordner nicht gefunden.')
            elif not target.is_file() or target.suffix.lower() not in TYPES:
                raise HTTPException(404, 'Video nicht gefunden. Datei eventuell verschoben oder gelöscht.')
            return target
        except (OSError, RuntimeError):
            raise HTTPException(404, 'Die lokale Mediendatei ist nicht verfügbar.') from None

    def browse(self, folder=''):
        if not self.root.is_dir() and not folder:
            return {'available': False, 'folder': '', 'items': [], 'truncated': False}
        target = self.resolve(folder, directory=True)
        items = []
        truncated = False
        try:
            with os.scandir(target) as entries:
                for entry in entries:
                    if entry.name.startswith('.'):
                        continue
                    relative = '/'.join(part for part in (folder, entry.name) if part)
                    try:
                        resolved = Path(entry.path).resolve(strict=True)
                        if not resolved.is_relative_to(self.root.resolve(strict=True)):
                            continue
                        if resolved.is_dir():
                            item = {'name': entry.name, 'path': relative, 'kind': 'folder', 'size': 0}
                        elif resolved.is_file() and resolved.suffix.lower() in TYPES:
                            item = {'name': entry.name, 'path': relative, 'kind': 'video', 'size': resolved.stat().st_size}
                        else:
                            continue
                        items.append(item)
                    except (OSError, RuntimeError):
                        continue  # A file may disappear while the directory is listed.
                    if len(items) == 1000:
                        truncated = True
                        break
        except OSError:
            raise HTTPException(503, 'Medienordner kann momentan nicht gelesen werden.') from None
        return {'available': True, 'folder': folder, 'items': sorted(items, key=lambda item: (item['kind'] != 'folder', item['name'].casefold())), 'truncated': truncated}

    def video(self, path):
        target = self.resolve(path)
        return FileResponse(target, media_type=TYPES[target.suffix.lower()])
