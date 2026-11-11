"""Isolated ephemeral backend, also mounted behind a simulated Ingress prefix."""
import tempfile

import uvicorn
from fastapi import FastAPI

from helden_training.backend.app import create_app

with tempfile.TemporaryDirectory(prefix='helden-e2e-') as directory:
    app = create_app(directory, ingress_only=False)
    # A mount exercises relative frontend/API/video paths just like HA Ingress.
    outer = FastAPI()

    @outer.middleware('http')
    async def simulated_proxy_limit(request, call_next):
        # Deliberately stricter than HA's reported 16 MiB ingress limit.
        # A legacy single-request upload must fail; small blocks must pass.
        if int(request.headers.get('content-length') or 0) > 512 * 1024:
            from fastapi.responses import JSONResponse
            return JSONResponse({'detail': 'Simulated proxy body limit'}, status_code=413)
        return await call_next(request)
    outer.mount('/api/hassio_ingress/test-token', app)
    outer.mount('/', app)
    # Mounted app lifespans are not started by Starlette automatically.
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def lifespan(_):
        async with app.router.lifespan_context(app):
            yield

    outer.router.lifespan_context = lifespan
    uvicorn.run(outer, host='127.0.0.1', port=8099, proxy_headers=False)
