"""Reject private files and recognizable credentials without printing values."""
from pathlib import Path
import re
import subprocess


def main():
    files = subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0')
    findings = []
    patterns = [
        r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
        r'ghp_[A-Za-z0-9]{30,}',
        r'github_pat_[A-Za-z0-9_]{30,}',
        r'sk-(?:proj-)?[A-Za-z0-9_-]{30,}',
        r'AIza[0-9A-Za-z_-]{30,}',
    ]
    for name in filter(None, files):
        path = Path(name)
        parts = path.parts
        if (path.name == '.env' or path.name.startswith('.env.')
                or any(part in {'.agents', '.claude', '.local', '.git'} for part in parts)
                or name == 'config/repository-manager.json'
                or path.suffix.lower() in {'.pem', '.key', '.pfx', '.p12', '.kdbx', '.bundle'}):
            findings.append(f'Archivo privado versionado: {name}')
        if not path.is_file() or path.stat().st_size > 2_000_000:
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except (UnicodeError, OSError):
            continue
        for number, line in enumerate(text.splitlines(), 1):
            if any(re.search(pattern, line) for pattern in patterns):
                findings.append(f'Posible credencial: {name}:{number}')
    if findings:
        raise SystemExit('\n'.join(findings))
    print('Archivos privados y patrones de credenciales comprobados: correcto.')


if __name__ == '__main__':
    main()
