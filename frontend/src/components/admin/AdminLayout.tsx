import { useEffect, Fragment } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../../context/AdminContext';

export default function AdminLayout() {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  const navItems = [
    { to: '/admin', label: t('admin.dashboard'), icon: '📊' },
    { to: '/admin/combos', label: 'Combos', icon: '📦' },
    { to: '/admin/productos', label: 'Productos', icon: '🛒' },
    { to: '/admin/multimedia', label: 'Multimedia', icon: '🖼️' },
    { to: '/admin/precios', label: t('admin.prices'), icon: '💰' },
    { to: '/admin/ordenes', label: t('admin.orders'), icon: '📋' },
    { to: '/admin/notificaciones', label: t('admin.notifications'), icon: '🔔' },
    { to: '/admin/redes', label: t('admin.social'), icon: '🔗' },
    { to: '/admin/cobertura', label: t('admin.coverage'), icon: '📍' },
  ];

  return (
    <Fragment>
      <meta name="robots" content="noindex" />
      <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <Link to="/" className="text-xl font-bold text-white">
            InstalaCámara
          </Link>
          <p className="text-sm text-gray-400 mt-1 capitalize">{user?.name}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.to
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <Link
            to="/"
            className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white mb-3"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Ver sitio web</span>
          </Link>
          <button
            onClick={logout}
            className="flex items-center space-x-2 text-sm text-gray-400 hover:text-red-400 w-full"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>{t('admin.logout')}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
    </Fragment>
  )
}
