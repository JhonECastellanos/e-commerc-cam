"""Create an isolated local QA configuration. Never overwrite an existing .env."""
from pathlib import Path
import secrets

root = Path(__file__).resolve().parents[1]
env = root / '.env'
if not env.exists():
    content = '\n'.join([
        'APP_ENV=development',
        f'POSTGRES_PASSWORD={secrets.token_hex(24)}',
        'POSTGRES_USER=instalacam', 'POSTGRES_DB=instalacam',
        f'SECRET_KEY={secrets.token_hex(32)}',
        f'INITIAL_ADMIN_EMAIL=admin-{secrets.token_hex(6)}@localhost.invalid',
        f'INITIAL_ADMIN_PASSWORD={secrets.token_urlsafe(24)}',
        'FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:8094,http://127.0.0.1:8094',
        'TRUSTED_HOSTS=localhost,127.0.0.1,testserver',
        'HTTP_PORT=8094', 'BACKEND_PORT=8001',
        'WHATSAPP_PROVIDER=off', 'GEMINI_API_KEY=', 'GEMINI_MODEL=gemini-3.1-flash-lite',
        'AUTO_INIT_DB=true', 'LOG_LEVEL=WARNING', '',
    ])
    env.write_text(content, encoding='utf-8')
    print('Creada configuración local aislada. Credenciales solo en .env; no se imprimen.')
else:
    print('Se conserva .env existente.')

backend_env = root / 'backend' / '.env'
if not backend_env.exists():
    values = dict(line.split('=', 1) for line in env.read_text(encoding='utf-8').splitlines() if '=' in line and not line.startswith('#'))
    values['DATABASE_URL'] = f"postgresql+asyncpg://{values['POSTGRES_USER']}:{values['POSTGRES_PASSWORD']}@127.0.0.1:5544/{values['POSTGRES_DB']}"
    values['PRIVATE_FILES_DIR'] = str(root / 'backend' / 'private_agreements').replace('\\', '/')
    backend_env.write_text('\n'.join(f'{key}={value}' for key, value in values.items()) + '\n', encoding='utf-8')
    print('Creada configuración de API nativa en backend/.env.')
