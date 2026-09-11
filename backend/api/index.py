"""Punto de entrada para Vercel (runtime Python / ASGI).

Vercel busca `app` en api/index.py y enruta todo el tráfico aquí según
backend/vercel.json. La aplicación es la misma de uvicorn/Docker.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: E402, F401
