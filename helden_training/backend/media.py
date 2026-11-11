"""Container detection shared by legacy and resumable uploads; no transcoding."""
from fastapi import HTTPException

MEDIA_TYPES = {'video/mp4', 'video/quicktime', 'video/x-quicktime', 'application/octet-stream'}


def video_suffix(header, size, content_type):
    modern = size >= 12 and header[4:8] == b'ftyp'
    legacy = (size >= 8 and header[4:8] in (b'moov', b'mdat', b'wide', b'free')
              and 8 <= int.from_bytes(header[:4], 'big') <= size)
    if not modern and not legacy:
        raise HTTPException(415, 'Die Datei ist kein unterstützter MP4-/MOV-Container.')
    is_mov = legacy or header[8:12] == b'qt  ' or content_type in ('video/quicktime', 'video/x-quicktime')
    return '.mov' if is_mov else '.mp4'
