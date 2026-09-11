import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, randomId } from '../../api/client';

export default function Checkout() {
  const { comboId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const storageChoice = searchParams.get('storage');
  const isCustom = location.pathname === '/checkout/custom';

  const [combo, setCombo] = useState<any>(null);
  const [customComboData, setCustomComboData] = useState<any>(null);
  const [priceData, setPriceData] = useState<any>(null);
  const [coverageAreas, setCoverageAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    customer_name: '',
    customer_doc: '',
    customer_phone: '',
    customer_email: '',
    address: '',
    municipality: '',
    terms_accepted: false,
  });
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const errorRef = useRef<HTMLDivElement | null>(null);
  const idempotencyKey = useRef(randomId());

  useEffect(() => {
    api.getPublicSettings().then(s => setWhatsappNumber(s.whatsapp_number || '')).catch(() => {});
  }, []);

  useEffect(() => {
    if ((error || loadError) && errorRef.current) errorRef.current.focus();
  }, [error, loadError]);

  useEffect(() => {
    if (isCustom) {
      const brand = searchParams.get('brand') || '';
      const mode = searchParams.get('mode') || 'cableado';
      const cameras = parseInt(searchParams.get('cameras') || '4');
      const resolution = searchParams.get('resolution') || '2MP';

      const brandNames: Record<string, string> = {
        'hikvision-hilook': 'Hikvision / HiLook',
        'dahua-cooper': 'Dahua / Cooper',
        'tp-link-tapo-vigi': 'TP-Link Tapo / Vigi',
        'ezviz': 'EZVIZ',
        'imou': 'Imou',
        'xiaomi': 'Xiaomi',
        'reolink': 'Reolink',
        'eufy': 'Eufy',
        'ring': 'Ring',
        'vta-mas': 'VTA+',
      };

      Promise.all([
        api.getCustomPrice({ brand_slug: brand, mode, cameras_count: cameras, resolution }),
        api.getCoverageAreas(),
      ])
        .then(([price, areas]) => {
          setCustomComboData({ brand_slug: brand, brand_name: brandNames[brand] || brand, mode, cameras_count: cameras, resolution });
          setPriceData(price);
          setCoverageAreas(areas);
        })
        .catch(() => setLoadError('No pudimos cargar los datos de tu pedido. Recarga la página e inténtalo de nuevo.'))
        .finally(() => setLoading(false));
    } else {
      Promise.all([
        api.getCombo(Number(comboId)),
        api.getComboPrice(Number(comboId), storageChoice || undefined),
        api.getCoverageAreas(),
      ])
        .then(([c, price, areas]) => {
          setCombo(c);
          setPriceData(price);
          setCoverageAreas(areas);
        })
        .catch(() => setLoadError('No pudimos cargar los datos de tu pedido. Recarga la página e inténtalo de nuevo.'))
        .finally(() => setLoading(false));
    }
  }, [comboId, storageChoice, isCustom, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.customer_name.trim()) {
      setError('El nombre completo es obligatorio');
      return;
    }
    if (!form.address.trim()) {
      setError('La dirección de instalación es obligatoria');
      return;
    }
    if (!form.municipality) {
      setError('Debes seleccionar un municipio');
      return;
    }
    if (!form.terms_accepted) {
      setError(t('checkout.error_terms'));
      return;
    }

    const isCovered = coverageAreas.some(
      (a) => a.name === form.municipality && a.active
    );
    if (!isCovered) {
      setError(t('checkout.error_coverage'));
      return;
    }

    setSubmitting(true);
    try {
      const orderData: any = {
        ...form,
        storage_choice: storageChoice,
      };

      if (isCustom && customComboData) {
        orderData.custom_combo = {
          brand_slug: customComboData.brand_slug,
          mode: customComboData.mode,
          cameras_count: customComboData.cameras_count,
          resolution: customComboData.resolution,
        };
      } else {
        orderData.combo_id = Number(comboId);
      }

      const result = await api.createOrder(orderData, idempotencyKey.current);
      sessionStorage.setItem(`order_access_${result.reference}`, result.order_access_token);

      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        navigate(`/confirmacion?reference=${result.reference}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) =>
    '$' + Math.round(price).toLocaleString('es-CO') + ' COP';

  if (loading) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  }
  if (!combo && !isCustom) {
    return <div className="text-center py-12 text-gray-500">{t('common.error')}</div>;
  }

  const displayCombo = combo || customComboData;
  const specs = displayCombo?.specs;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('checkout.title')}</h1>

      <div className="grid md:grid-cols-5 gap-8">
        <div className="md:col-span-3">
          <form onSubmit={handleSubmit} className="card space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('checkout.personal_data')}</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="customer_name" className="label">{t('checkout.name')} *</label>
                  <input
                    id="customer_name"
                    className="input-field"
                    required
                    maxLength={120}
                    autoComplete="name"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="customer_doc" className="label">{t('checkout.doc')} *</label>
                  <input
                    id="customer_doc"
                    className="input-field"
                    required
                    maxLength={30}
                    autoComplete="off"
                    value={form.customer_doc}
                    onChange={(e) => setForm({ ...form, customer_doc: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="customer_phone" className="label">{t('checkout.phone')} *</label>
                  <input
                    id="customer_phone"
                    className="input-field"
                    type="tel"
                    required
                    maxLength={20}
                    autoComplete="tel"
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="customer_email" className="label">{t('checkout.email')}</label>
                  <input
                    id="customer_email"
                    className="input-field"
                    type="email"
                    maxLength={254}
                    autoComplete="email"
                    value={form.customer_email}
                    onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="address" className="label">{t('checkout.address')} *</label>
                  <input
                    id="address"
                    className="input-field"
                    required
                    maxLength={300}
                    autoComplete="street-address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="municipality" className="label">{t('checkout.municipality')} *</label>
                  <select
                    id="municipality"
                    className="input-field"
                    required
                    value={form.municipality}
                    onChange={(e) => setForm({ ...form, municipality: e.target.value })}
                  >
                    <option value="">{t('checkout.select_municipality')}</option>
                    {coverageAreas.map((a) => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                  {whatsappNumber && (
                    <a
                      href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola, mi municipio no aparece en la cobertura. ¿Pueden ayudarme?')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-500 hover:text-primary-600 mt-1 inline-block"
                    >
                      {t('checkout.not_covered')}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={form.terms_accepted}
                  onChange={(e) => setForm({ ...form, terms_accepted: e.target.checked })}
                />
                <span className="text-sm text-gray-600">
                  {t('checkout.terms_accept')}{' '}
                  <Link to="/condiciones" target="_blank" className="text-primary-500 hover:text-primary-600 underline">
                    {t('checkout.read_terms')}
                  </Link>
                </span>
              </label>

              {(error || loadError) && (
                <div ref={errorRef} tabIndex={-1} role="alert" className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                  {error || loadError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? t('common.loading') : t('checkout.pay_deposit')}
              </button>
            </div>
          </form>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-4">{t('checkout.order_summary')}</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">{isCustom ? customComboData?.brand_name : combo?.brand_name} - {isCustom ? customComboData?.cameras_count : combo?.cameras_count} cámaras {isCustom ? customComboData?.resolution : combo?.resolution}</span>
                <span className="font-semibold">{priceData ? formatPrice(priceData.total) : ''}</span>
              </div>
              {!isCustom && combo?.mode && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Modo:</span>
                  <span>{combo.mode === 'cableado' ? 'Cableado CCTV+DVR' : combo.mode === 'inalambrico' ? 'Inalámbrico WiFi' : combo.mode === 'hibrido' ? 'Híbrido' : 'Solar / PoE'}</span>
                </div>
              )}
              {storageChoice && priceData?.storage_price > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Almacenamiento ({storageChoice})</span>
                  <span>{formatPrice(priceData.storage_price)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>{t('checkout.total')}</span>
                <span className="text-primary-500">{formatPrice(priceData ? priceData.total : (combo?.final_price || 0))}</span>
              </div>
              <div className="flex justify-between text-secondary-600 font-semibold">
                <span>{t('checkout.deposit')}</span>
                <span>{formatPrice(priceData ? priceData.deposit_50 : (combo?.final_price || 0) * 0.5)}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-sm">
                <span>{t('checkout.balance')}</span>
                <span>{formatPrice(priceData ? priceData.balance_50 : (combo?.final_price || 0) * 0.5)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('checkout.balance_note')}</p>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-gray-900 mb-4">Lo que incluye el servicio</h3>
            <div className="space-y-3 text-sm">
              {!isCustom && combo?.image_url && (
                <img src={combo.image_url} alt={combo.brand_name || ''} className="w-full h-40 object-contain rounded-lg border bg-white p-2" />
              )}
              {displayCombo?.included_items && displayCombo.included_items.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1 text-xs uppercase tracking-wide">Incluye:</p>
                  <ul className="space-y-1">
                    {(displayCombo.included_items as string[]).map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start space-x-2 text-gray-600">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {specs && Object.keys(specs).length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1 text-xs uppercase tracking-wide">Ficha técnica:</p>
                  <div className="divide-y divide-gray-100">
                    {Object.entries(specs).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1">
                        <span className="text-gray-500 text-xs">{key}</span>
                        <span className="text-gray-800 text-xs font-medium">{value as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!isCustom && combo?.warranty_text && (
                <div className="flex items-start space-x-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span>🔧</span>
                  <span>{combo.warranty_text}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
