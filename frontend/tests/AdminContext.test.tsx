import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AdminProvider, useAdmin } from '../src/context/AdminContext';

function Consumer() {
  const { user, isAuthenticated, login, logout } = useAdmin();
  return (
    <div>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.email : 'sin-usuario'}</span>
      <button onClick={() => login('jwt-nuevo')}>entrar</button>
      <button onClick={() => logout()}>salir</button>
    </div>
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('AdminContext', () => {
  it('sin token no está autenticado', () => {
    vi.stubGlobal('fetch', vi.fn());
    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>
    );
    expect(screen.getByTestId('auth').textContent).toBe('false');
  });

  it('login guarda el token en sessionStorage y carga /admin/me', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>
    );
    await act(async () => {
      screen.getByText('entrar').click();
    });

    expect(sessionStorage.getItem('admin_token')).toBe('jwt-nuevo');
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('admin@test.com'));
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/me', {
      headers: { Authorization: 'Bearer jwt-nuevo' },
    });
  });

  it('una respuesta 401 en /admin/me cierra la sesión', async () => {
    sessionStorage.setItem('admin_token', 'jwt-vencido');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({ detail: 'Token inválido' }) })
    );

    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>
    );
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('false'));
    expect(sessionStorage.getItem('admin_token')).toBeNull();
  });

  it('migra un token heredado de localStorage a sessionStorage', () => {
    localStorage.setItem('admin_token', 'jwt-legado');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));

    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>
    );
    expect(sessionStorage.getItem('admin_token')).toBe('jwt-legado');
    expect(localStorage.getItem('admin_token')).toBeNull();
    expect(screen.getByTestId('auth').textContent).toBe('true');
  });

  it('logout limpia token y usuario', async () => {
    sessionStorage.setItem('admin_token', 'jwt-activo');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ email: 'a@b.co' }) }));

    render(
      <AdminProvider>
        <Consumer />
      </AdminProvider>
    );
    await act(async () => {
      screen.getByText('salir').click();
    });
    expect(screen.getByTestId('auth').textContent).toBe('false');
    expect(sessionStorage.getItem('admin_token')).toBeNull();
  });
});
