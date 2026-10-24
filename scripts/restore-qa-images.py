"""Restore only image references overwritten by this task's QA upload tests."""
import argparse
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--project', choices=['instalacam-integracion-local', 'instalacam-integracion-qa'], required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
records = [json.loads(file.read_text(encoding='utf-8')) for file in (root / 'frontend' / 'test-results').rglob('image-restore.json')]
if not records:
    print('No hay referencias QA que restaurar.')
    raise SystemExit(0)
for record in records:
    if not isinstance(record.get('id'), int) or not record.get('test_url', '').startswith('/api/uploads/catalog/'):
        raise SystemExit('Registro QA inválido; no se modificó la base.')
code = """
import asyncio,json,sys
from sqlalchemy import text
from app.database import engine
records=json.load(sys.stdin)
async def restore():
    async with engine.begin() as connection:
        count=0
        for r in records:
            result=await connection.execute(text('UPDATE products SET image_url=:original WHERE id=:id AND image_url=:test_url'),r)
            count+=result.rowcount
        print('Referencias QA restauradas:',count)
    await engine.dispose()
asyncio.run(restore())
"""
if args.project != 'instalacam-integracion-local':
    raise SystemExit('Este helper usa exclusivamente el backend local integrado; la QA nativa se conserva separada.')
result = subprocess.run(['docker.exe', 'compose', '-p', args.project, 'exec', '-T', 'backend', 'python', '-c', code], cwd=root, input=json.dumps(records), text=True, check=False)
raise SystemExit(result.returncode)
