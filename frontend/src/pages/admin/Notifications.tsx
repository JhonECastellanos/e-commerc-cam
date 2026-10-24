import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

export default function Notifications() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = () => {
    api.adminGetNotifications()
      .then((data) => {
        setNotifications(data.items || []);
        setUnreadCount(data.unread_count || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: number) => {
    await api.adminMarkNotificationRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await api.adminMarkAllRead();
    loadNotifications();
  };

  const typeIcons: Record<string, string> = {
    payment: '💳',
    reservation: '📅',
    system: '🔔',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.notifications')}</h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-outline py-2 px-4 text-sm">
            {t('admin.mark_all_read')} ({unreadCount})
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`card flex items-start space-x-4 ${!n.read ? 'border-l-4 border-l-primary-500 bg-primary-50/30' : ''}`}
            >
              <div className="text-2xl">{typeIcons[n.type] || '🔔'}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{n.title}</h3>
                {n.message && <p className="text-sm text-gray-500 mt-1">{n.message}</p>}
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString('es-CO')}
                  </span>
                  {n.order_id && (
                    <Link
                      to={`/admin/ordenes/${n.order_id}`}
                      className="text-xs text-primary-500 hover:text-primary-600"
                    >
                      Ver orden
                    </Link>
                  )}
                </div>
              </div>
              {!n.read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="text-xs text-gray-400 hover:text-primary-500"
                  title={t('admin.mark_read')}
                >
                  ✅
                </button>
              )}
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-12 text-gray-400">{t('admin.no_data')}</div>
          )}
        </div>
      )}
    </div>
  );
}
