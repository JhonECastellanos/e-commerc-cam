import { useEffect, useState, Fragment } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../../admin.css';
import { useAdmin } from '../../context/AdminContext';

export default function AdminLayout() {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>setMenuOpen(false),[location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  const navItems = [
    { to: '/admin', label: t('admin.dashboard'), icon: 'grid' },
    { to: '/admin/combos', label: 'Combos', icon: 'grid' },
    { to: '/admin/productos', label: 'Productos', icon: 'grid' },
    { to: '/admin/multimedia', label: 'Multimedia', icon: 'grid' },
    { to: '/admin/precios', label: t('admin.prices'), icon: 'grid' },
    { to: '/admin/ordenes', label: t('admin.orders'), icon: 'grid' },
    { to: '/admin/asesorias', label: 'Solicitudes de asesoría', icon: 'grid' },
    { to: '/admin/agenda', label: 'Agenda y clientes', icon: 'grid' },
    { to: '/admin/agente', label: 'Agente y WhatsApp', icon: 'grid' },
    { to: '/admin/notificaciones', label: t('admin.notifications'), icon: 'grid' },
    { to: '/admin/redes', label: t('admin.social'), icon: 'grid' },
    { to: '/admin/cobertura', label: t('admin.coverage'), icon: 'grid' },
  ];

  return (
    <Fragment>
      <meta name="robots" content="noindex" />
      <div className="admin-shell">
      <header className="admin-mobile-header"><Link to="/">InstalaCámara</Link><button aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen ? 'Cerrar menú' : 'Administrar'}</button></header>
      <aside className={`admin-sidebar ${menuOpen ? 'admin-sidebar-open' : ''}`}>
        <div className="p-6 border-b border-gray-800">
          <Link to="/" className="text-xl font-bold text-white">
            InstalaCámara
          </Link>
          <p className="text-sm text-gray-400 mt-1 capitalize">{user?.name}</p>
        </div>

        <nav id="admin-navigation" aria-label="Administración" className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={location.pathname === item.to ? 'page' : undefined}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                (location.pathname === item.to || (item.to !== '/admin' && location.pathname.startsWith(item.to + '/')))
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <svg aria-hidden="true" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
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

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
    </Fragment>
  )
}
