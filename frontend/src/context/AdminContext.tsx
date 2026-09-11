import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AdminContextType {
  user: AdminUser | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AdminContext = createContext<AdminContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AdminProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const existing = sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token');
    if (existing) sessionStorage.setItem('admin_token', existing);
    localStorage.removeItem('admin_token');
    return existing;
  });
  const [user, setUser] = useState<AdminUser | null>(null);

  const login = (newToken: string) => {
    sessionStorage.setItem('admin_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    sessionStorage.removeItem('admin_token');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (token && !user) {
      fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => {
          // A 401/403 returns an error JSON body; without this check it would be
          // stored as the user object instead of logging out.
          if (!r.ok) throw new Error('unauthorized');
          return r.json();
        })
        .then((data) => setUser(data))
        .catch(() => logout());
    }
  }, [token]);

  return (
    <AdminContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => useContext(AdminContext);
