"""Read-only checks for the public nginx entry; never sends admin credentials."""
import argparse
import json
import urllib.error
import urllib.parse
import urllib.request


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', required=True)
    parser.add_argument('--host', default='')
    parser.add_argument('--solo-estatico', action='store_true', help='Verifica la imagen Nginx en CI sin backend ni datos')
    args = parser.parse_args()
    base = args.url.rstrip('/')
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def request(path, method='GET'):
        req = urllib.request.Request(base + path, method=method, headers={'Host': args.host or urllib.parse.urlsplit(base).netloc})
        try:
            with opener.open(req, timeout=20) as response:
                return response.status, response.headers, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.headers, error.read()

    pages = ['/', '/catalogo', '/asesoria', '/agenda', '/servicios', '/conocenos', '/simulador/casa', '/simulador/apartamento']
    for path in pages:
        status, headers, body = request(path)
        assert status == 200 and b'<!doctype html' in body.lower(), (path, status)
        assert "frame-ancestors 'none'" in headers.get('Content-Security-Policy', '')
        assert headers.get('X-Content-Type-Options') == 'nosniff'

    api_routes = [] if args.solo_estatico else ['/api/products', '/api/combos', '/api/settings/public', '/api/banners', '/api/advisory/privacy', '/api/simulation/capabilities']
    for path in api_routes:
        status, _, body = request(path)
        assert status == 200, (path, status)
        result = json.loads(body)
        if path in {'/api/products', '/api/combos'}:
            assert result and all(item.get('image_url') for item in result)

    denied = ['/admin', '/admin/login', '/admin/login/', '/ADMIN/login', '/api/admin/me', '/api/admin/login', '/api/admin/prices/settings', '/api/admin/agent/mcp', '/api/internal/whatsapp/incoming', '/api/ws/updates', '/api/uploads/agreements/test.pdf', '/.env', '/.git/config', '/docs', '/openapi.json', '/api/%61dmin/login', '/api/%2561dmin/login', '/assets/%2e%2e/admin/login', '/api%2fadmin/login', '//api//admin/login', '/api/products/../admin/login']
    for path in denied:
        for method in ['GET', 'POST', 'PUT']:
            status, _, _ = request(path, method)
            assert status in {400, 404}, (method, path, status)
    print(json.dumps({'public_pages': len(pages), 'public_api_routes': len(api_routes), 'private_path_method_checks': len(denied) * 3, 'result': 'passed'}))


if __name__ == '__main__':
    main()
