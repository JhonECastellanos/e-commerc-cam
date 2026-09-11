import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

export default function OrderDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminGetOrder(Number(id))
      .then(setOrder)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

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

  const modeLabels: Record<string, string> = {
    cableado: 'Cableado CCTV+DVR',
    inalambrico: 'Inalámbrico WiFi',
    hibrido: 'Híbrido / Perímetro inteligente',
    solar: 'Solar / PoE',
  };

  const complexityLabels: Record<string, string> = {
    baja: 'Baja - Instalación sencilla',
    media: 'Media - Configuración técnica',
    alta: 'Alta - Cableado profesional',
  };

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  if (!order) return <div className="text-center py-12 text-gray-500">{t('common.error')}</div>;

  const combo = order.combo;

  return (
    <div className="space-y-6">
      <Link to="/admin/ordenes" className="text-primary-500 hover:text-primary-600 inline-flex items-center space-x-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        <span>&larr; Volver a órdenes</span>
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Orden {order.reference}
          </h1>
          <p className="text-sm text-gray-500">
            Creada: {new Date(order.created_at).toLocaleString('es-CO')}
          </p>
        </div>
        <span className={statusColors[order.status]}>{statusLabels[order.status] || order.status}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="font-bold text-gray-900 text-lg border-b pb-2">Datos del cliente</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Nombre completo</p>
              <p className="font-medium">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Documento</p>
              <p className="font-medium">{order.customer_doc}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Teléfono / WhatsApp</p>
              <p className="font-medium">{order.customer_phone}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Email</p>
              <p className="font-medium">{order.customer_email || '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500 text-xs">Dirección de instalación</p>
              <p className="font-medium">{order.address}, {order.municipality}</p>
            </div>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-bold text-gray-900 text-lg border-b pb-2">Resumen financiero</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total:</span>
              <span className="font-semibold">{formatPrice(order.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Anticipo (50%):</span>
              <span className="font-semibold text-green-600">{formatPrice(order.deposit_50)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Saldo:</span>
              <span className="font-semibold">{formatPrice(order.balance_50)}</span>
            </div>
            {order.storage_choice && (
              <div className="flex justify-between">
                <span className="text-gray-500">Almacenamiento:</span>
                <span className="font-semibold">{order.storage_choice} ({formatPrice(order.storage_price)})</span>
              </div>
            )}
            {order.wompi_transaction_id && (
              <p className="text-xs text-gray-400 pt-2">Transacción Wompi: {order.wompi_transaction_id}</p>
            )}
          </div>
        </div>
      </div>

      {combo && (
        <div className="card space-y-4">
          <h2 className="font-bold text-gray-900 text-lg border-b pb-2">Combo contratado</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Marca</p>
              <p className="font-medium">{combo.brand_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Cámaras</p>
              <p className="font-medium">{combo.cameras_count}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Resolución</p>
              <p className="font-medium">{combo.resolution}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Modo de instalación</p>
              <p className="font-medium">{modeLabels[combo.mode] || combo.mode}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Complejidad de instalación</p>
              <p className="font-medium">{complexityLabels[combo.install_complexity] || combo.install_complexity || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Garantía</p>
              <p className="font-medium">{combo.warranty_text || 'N/A'}</p>
            </div>
          </div>

          {combo.specs && Object.keys(combo.specs).length > 0 && (
            <div className="mt-2">
              <h3 className="font-semibold text-gray-700 mb-2">Ficha técnica</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {Object.entries(combo.specs).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded p-2">
                    <p className="text-gray-500">{key}</p>
                    <p className="font-medium">{value as string}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {combo.included_items && combo.included_items.length > 0 && (
            <div className="mt-2">
              <h3 className="font-semibold text-gray-700 mb-2">Incluye</h3>
              <div className="flex flex-wrap gap-1">
                {(combo.included_items as string[]).map((item: string, idx: number) => (
                  <span key={idx} className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {order.reference && (
          <a
            href={`/api/orders/${order.reference}/pdf`}
            target="_blank"
            className="btn-outline"
          >
            Descargar PDF
          </a>
        )}
        {order.customer_phone && (
          <a
            href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Contactar por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
