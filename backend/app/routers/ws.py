from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Set

from app.config import settings

router = APIRouter()

connected_clients: Set[WebSocket] = set()

# Bound idle connections so an unauthenticated broadcast channel cannot exhaust resources.
MAX_WS_CLIENTS = 200

@router.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    # Only accept connections from configured frontend origins.
    origin = websocket.headers.get("origin")
    if settings.cors_origins and origin not in settings.cors_origins:
        await websocket.close(code=1008)
        return
    if len(connected_clients) >= MAX_WS_CLIENTS:
        await websocket.close(code=1013)
        return
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        connected_clients.discard(websocket)

async def notify_clients(message: str = "reload"):
    dead = set()
    for ws in connected_clients:
        try:
            await ws.send_text(message)
        except Exception:
            dead.add(ws)
    connected_clients.difference_update(dead)
