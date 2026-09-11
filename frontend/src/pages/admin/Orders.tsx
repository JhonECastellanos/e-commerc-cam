import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

export default function Orders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrders = () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), per_page: '20' };
    if (statusFilter) params.status = statusFilter;

    api.adminGetOrders(params)
      .then((data) => {
        setOrders(data.items || []);
        setTotal(data.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.adminUpdateOrderStatus(id, newStatus);
      loadOrders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatPrice = (price: number) =>
    '$' + Math.round(price).toLocaleString('es-CO');

  const statusLabels: Record<string, string> = {
    cotizacion: t('admin.status_quote'),
    reservado: t('admin.status_reserved'),
    pagado: t('admin.status_paid'),
    instalado: t('admin.status_installed'),
    cancelado: t('admin.status_cancelled'),
  };

  const statusColors: Record<string, string> = {
    cotizacion: 'badge-yellow',
    reservado: 'badge-blue',
    pagado: 'badge-green',
    instalado: 'badge-green',
    cancelado: 'badge-red',
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.orders')}</h1>
        <select
          className="input-field w-48"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">Todos los estados</option>
          <option value="cotizacion">{t('admin.status_quote')}</option>
          <option value="reservado">{t('admin.status_reserved')}</option>
          <option value="pagado">{t('admin.status_paid')}</option>
          <option value="instalado">{t('admin.status_installed')}</option>
          <option value="cancelado">{t('admin.status_cancelled')}</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : (
        <>
          <div className="card" style={{ isolation: 'isolate' }}>
            <div className="overflow-auto" style={{ maxHeight: '500px' }}>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Ref</th>
                  <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Cliente</th>
                  <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Municipio</th>
                  <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Total</th>
                  <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Anticipo</th>
                  <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Estado</th>
                  <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Fecha</th>
                  <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <Link to={`/admin/ordenes/${o.id}`} className="text-primary-500 hover:text-primary-600 font-medium">
                        {o.reference}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{o.customer_name}</td>
                    <td className="px-3 py-3">{o.municipality}</td>
                    <td className="px-3 py-3 font-semibold">{formatPrice(o.total)}</td>
                    <td className="px-3 py-3">{formatPrice(o.deposit_50)}</td>
                    <td className="px-3 py-3">
                      <span className={statusColors[o.status] || 'badge-gray'}>
                        {statusLabels[o.status] || o.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs">{new Date(o.created_at).toLocaleDateString('es-CO')}</td>
                    <td className="px-3 py-3">
                      <select
                        className="text-xs border rounded px-2 py-1"
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      >
                        <option value="cotizacion">{t('admin.status_quote')}</option>
                        <option value="reservado">{t('admin.status_reserved')}</option>
                        <option value="pagado">{t('admin.status_paid')}</option>
                        <option value="instalado">{t('admin.status_installed')}</option>
                        <option value="cancelado">{t('admin.status_cancelled')}</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-400">{t('admin.no_data')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-outline py-2 px-4 text-sm"
              >
                &larr;
              </button>
              <span className="py-2 px-4 text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn-outline py-2 px-4 text-sm"
              >
                &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
