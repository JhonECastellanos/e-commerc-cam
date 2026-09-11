import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api, randomId } from '../src/api/client';

function mockFetch(body: unknown, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: 'X',
    json: () => Promise.resolve(body),
    blob: () => Promise.resolve(new Blob()),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('randomId', () => {
  it('genera identificadores únicos', () => {
    expect(randomId()).not.toEqual(randomId());
  });

  it('funciona sin crypto.randomUUID (contextos no seguros)', () => {
    vi.stubGlobal('crypto', {});
    const id = randomId();
    expect(id.length).toBeGreaterThan(8);
  });
});

describe('cliente HTTP', () => {
  it('envía Content-Type y X-Request-ID en cada petición', async () => {
    const fetchMock = mockFetch([]);
    await api.getBrands();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/brands');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['X-Request-ID']).toBeTruthy();
  });

  it('adjunta el token admin desde sessionStorage', async () => {
    sessionStorage.setItem('admin_token', 'jwt-de-prueba');
    const fetchMock = mockFetch({});
    await api.adminGetDashboard();
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer jwt-de-prueba');
  });

  it('no envía Authorization sin token', async () => {
    const fetchMock = mockFetch([]);
    await api.getCombos();
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers['Authorization']).toBeUndefined();
  });

  it('lanza el detalle del backend cuando la respuesta no es 2xx', async () => {
    mockFetch({ detail: 'El municipio seleccionado no cuenta con cobertura' }, false, 400);
    await expect(api.getBrands()).rejects.toThrow('El municipio seleccionado no cuenta con cobertura');
  });

  it('createOrder envía la Idempotency-Key y el cuerpo JSON', async () => {
    const fetchMock = mockFetch({ reference: 'IC-1' });
    const payload = { combo_id: 1, terms_accepted: true };
    await api.createOrder(payload, 'clave-idempotente-123');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/orders');
    expect(options.method).toBe('POST');
    expect(options.headers['Idempotency-Key']).toBe('clave-idempotente-123');
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it('getOrder envía el token de acceso de la orden', async () => {
    const fetchMock = mockFetch({ status: 'reservado' });
    await api.getOrder('IC-ABC', 'token-orden');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/orders/IC-ABC');
    expect(options.headers['X-Order-Access-Token']).toBe('token-orden');
  });

  it('getCombos serializa los filtros como query string', async () => {
    const fetchMock = mockFetch([]);
    await api.getCombos({ brand: 'hikvision', mode: 'cableado' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/combos?brand=hikvision&mode=cableado');
  });

  it('adminLogin hace POST con las credenciales', async () => {
    const fetchMock = mockFetch({ access_token: 'jwt' });
    await api.adminLogin('admin@test.com', 'clave');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/admin/login');
    expect(JSON.parse(options.body)).toEqual({ email: 'admin@test.com', password: 'clave' });
  });
});
