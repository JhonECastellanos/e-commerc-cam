import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

export default function PaymentConfirm() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') || '';
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [pdfError, setPdfError] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const orderAccessToken = reference ? sessionStorage.getItem(`order_access_${reference}`) : null;

  const waHref = (text: string) =>
    whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}` : '';

  useEffect(() => {
    api.getPublicSettings().then(s => setWhatsappNumber(s.whatsapp_number || '')).catch(() => {});
  }, []);

  useEffect(() => {
    if (!reference) {
      setStatus('error');
      setLoading(false);
      return;
    }

    if (!orderAccessToken) {
      setStatus('error');
      setLoading(false);
      return;
    }

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const pollOrder = async () => {
      try {
        const data = await api.getOrder(reference, orderAccessToken);
        setOrder(data);
        if (data.status === 'reservado') {
          setStatus('success');
          stopPolling();
        } else if (data.status === 'cotizacion') {
          setStatus('pending');
        } else {
          setStatus('error');
          stopPolling();
        }
      } catch {
        setStatus('error');
      } finally {
        setLoading(false);
      }
    };

    pollOrder();
    intervalRef.current = setInterval(pollOrder, 5000);
    return stopPolling;
  }, [reference, orderAccessToken]);

  const downloadPdf = async () => {
    if (!orderAccessToken) return;
    setPdfError('');
    try {
      const blob = await api.downloadOrderPdf(reference, orderAccessToken);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `acuerdo_${reference}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setPdfError(err.message || 'No fue posible descargar el documento');
    }
  };

  const formatPrice = (price: number) =>
    '$' + Math.round(price).toLocaleString('es-CO') + ' COP';

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="text-6xl mb-6 animate-pulse">⏳</div>
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      {status === 'success' && (
        <>
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('payment.success')}</h1>
          <p className="text-gray-600 mb-6">{t('payment.success_msg')}</p>

          {order && (
            <div className="card text-left mb-6 space-y-2">
              <p className="text-sm text-gray-500">{t('payment.order_ref')}: <strong>{order.reference}</strong></p>
              <p className="text-sm text-gray-500">{t('checkout.deposit')}: <strong>{formatPrice(order.deposit_50)}</strong></p>
              <p className="text-sm text-gray-500">{t('checkout.balance')}: <strong>{formatPrice(order.balance_50)}</strong></p>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={downloadPdf}
              className="btn-outline w-full block text-center"
            >
              {t('payment.download_pdf')}
            </button>
            {pdfError && <p role="alert" className="text-sm text-red-600">{pdfError}</p>}
            {whatsappNumber && (
              <a
                href={waHref(`Hola, soy ${order?.customer_name || ''}, mi orden es ${reference}. Quiero confirmar los detalles de mi instalación.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full block text-center"
              >
                {t('payment.contact_whatsapp')}
              </a>
            )}
            <Link to="/" className="text-primary-500 hover:text-primary-600 block">
              {t('payment.back_home')}
            </Link>
          </div>
        </>
      )}

      {status === 'pending' && (
        <>
          <div className="text-6xl mb-6 animate-pulse">⏳</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('payment.pending')}</h1>
          <p className="text-gray-600 mb-6">{t('payment.pending_msg')}</p>
          {whatsappNumber && (
            <a
              href={waHref(`Hola, mi orden ${reference} está pendiente de pago.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              {t('payment.contact_whatsapp')}
            </a>
          )}
        </>
      )}

      {status === 'error' && (
        <>
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('payment.error')}</h1>
          <p className="text-gray-600 mb-6">{t('payment.error_msg')}</p>
          <div className="space-y-3">
            {whatsappNumber && (
              <a
                href={waHref(`Hola, tuve un problema con el pago de mi orden ${reference}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary block w-full text-center"
              >
                {t('payment.contact_whatsapp')}
              </a>
            )}
            <Link to="/catalogo" className="btn-outline block w-full text-center">
              {t('payment.back_home')}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
