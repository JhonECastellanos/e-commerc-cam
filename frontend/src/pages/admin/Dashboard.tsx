import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import StatsCard from '../../components/admin/StatsCard';

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminGetDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
    cotizacion: 'bg-yellow-400',
    reservado: 'bg-blue-400',
    pagado: 'bg-green-400',
    instalado: 'bg-primary-400',
    cancelado: 'bg-red-400',
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title={t('admin.sales_month')}
          value={formatPrice(data?.total_sales_month || 0)}
          icon="💰"
          color="bg-green-500"
        />
        <StatsCard
          title={t('admin.sales_total')}
          value={formatPrice(data?.total_sales_all || 0)}
          icon="📈"
          color="bg-blue-500"
        />
        <StatsCard
          title={t('admin.avg_ticket')}
          value={formatPrice(data?.avg_ticket || 0)}
          icon="🎫"
          color="bg-purple-500"
        />
        <StatsCard
          title={t('admin.installed')}
          value={data?.installed_count || 0}
          icon="✅"
          color="bg-primary-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('admin.orders_by_status')}</h2>
          <div className="space-y-3">
            {data?.orders_by_status && Object.entries(data.orders_by_status).map(([status, count]: any) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${statusColors[status] || 'bg-gray-400'}`}></div>
                  <span className="text-sm text-gray-600">{statusLabels[status] || status}</span>
                </div>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
            {(!data?.orders_by_status || Object.keys(data.orders_by_status).length === 0) && (
              <p className="text-sm text-gray-400">{t('admin.no_data')}</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('admin.sales_by_mode')}</h2>
          <div className="space-y-3">
            {data?.sales_by_mode?.map((item: any) => (
              <div key={item.mode} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{item.mode}</span>
                <span className="font-semibold">{formatPrice(item.total)}</span>
              </div>
            ))}
            {(!data?.sales_by_mode || data.sales_by_mode.length === 0) && (
              <p className="text-sm text-gray-400">{t('admin.no_data')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card" style={{ isolation: 'isolate' }}>
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('admin.top_combos')}</h2>
          <div className="overflow-auto" style={{ maxHeight: '300px' }}>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.brand')}</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.cameras')}</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.mode')}</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Órdenes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data?.top_combos?.map((c: any) => (
                  <tr key={c.combo_id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{c.brand_name}</td>
                    <td className="px-3 py-2">{c.cameras_count} × {c.resolution}</td>
                    <td className="px-3 py-2 capitalize">{c.mode}</td>
                    <td className="px-3 py-2 text-right font-semibold">{c.total_orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.top_combos || data.top_combos.length === 0) && (
              <p className="text-sm text-gray-400 py-4">{t('admin.no_data')}</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('admin.top_municipalities')}</h2>
          <div className="space-y-3">
            {data?.top_municipalities?.map((m: any) => (
              <div key={m.municipality} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{m.municipality}</span>
                <span className="font-semibold">{m.count} {m.count === 1 ? 'orden' : 'órdenes'}</span>
              </div>
            ))}
            {(!data?.top_municipalities || data.top_municipalities.length === 0) && (
              <p className="text-sm text-gray-400">{t('admin.no_data')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('admin.sales_by_brand')}</h2>
        <div className="space-y-3">
          {data?.sales_by_brand?.map((item: any) => (
            <div key={item.brand_id} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Marca #{item.brand_id}</span>
              <span className="font-semibold">{formatPrice(item.total)}</span>
            </div>
          ))}
          {(!data?.sales_by_brand || data.sales_by_brand.length === 0) && (
            <p className="text-sm text-gray-400">{t('admin.no_data')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
