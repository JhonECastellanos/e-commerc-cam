import { useState, useEffect, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

export default function Prices() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'combos' | 'settings' | 'audit'>('combos');
  const [combos, setCombos] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [changelog, setChangelog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savingSpec, setSavingSpec] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.adminGetCombos(),
      api.adminGetSettings(),
      api.adminGetChangeLog(),
    ])
      .then(([c, s, l]) => {
        setCombos(c);
        setSettings(s);
        setChangelog(l);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveCombo = async (id: number) => {
    try {
      await api.adminUpdateCombo(id, editForm);
      setEditingId(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveSpec = async (id: number, field: string, value: any) => {
    setSavingSpec(true);
    try {
      await api.adminUpdateCombo(id, { [field]: value });
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingSpec(false);
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    try {
      await api.adminUpdateSetting(key, value);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatPrice = (price: number) =>
    '$' + Math.round(price).toLocaleString('es-CO') + ' COP';

  const complexityColors: Record<string, string> = {
    baja: 'text-green-600 bg-green-50',
    media: 'text-yellow-600 bg-yellow-50',
    alta: 'text-red-600 bg-red-50',
  };

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;

  const settingLabels: Record<string, string> = {
    install_fee_per_camera: t('admin.install_fee') + ' (cableado/híbrido/solar)',
    install_fee_per_camera_wireless: t('admin.install_fee') + ' (inalámbrico)',
    vat_rate: t('admin.vat_rate'),
    business_name: t('admin.business_name'),
    business_nit: t('admin.business_nit'),
    business_contact: t('admin.business_contact'),
    cancellation_policy: t('admin.cancellation_policy'),
    installation_lead_days: t('admin.installation_lead_days'),
    labor_warranty_months: t('admin.labor_warranty_months'),
    balance_payment_term: t('admin.balance_term'),
    urgency_message: t('admin.urgency'),
    about_image_url: 'Foto del técnico (Conócenos)',
  };

  const modeLabels: Record<string, string> = {
    cableado: 'Cableado',
    inalambrico: 'Inalámbrico',
    hibrido: 'Híbrido',
    solar: 'Solar',
  };

  const complexityOptions = [
    { value: 'baja', label: 'Baja - Instalación sencilla' },
    { value: 'media', label: 'Media - Configuración técnica' },
    { value: 'alta', label: 'Alta - Cableado profesional' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('admin.prices')}</h1>

      <div className="flex space-x-2 border-b">
        {(['combos', 'settings', 'audit'] as const).map((tabName) => (
          <button
            key={tabName}
            onClick={() => setTab(tabName)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === tabName
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tabName === 'combos' ? 'Combos' : tabName === 'settings' ? 'Configuración' : t('admin.change_log')}
          </button>
        ))}
      </div>

      {tab === 'combos' && (
        <div className="card" style={{ isolation: 'isolate' }}>
          <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.brand')}</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.mode')}</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.resolution')}</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.cameras')}</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Precio equipo</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Instalación x cámara</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.final_price')}</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Complejidad</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.warranty')}</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.active')}</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {combos.map((c) => (
                <Fragment key={c.id}>
                  <tr className="hover:bg-gray-50">
                    {editingId === c.id ? (
                      <>
                        <td className="px-3 py-2">{c.brand_name}</td>
                        <td className="px-3 py-2">{modeLabels[c.mode] || c.mode}</td>
                        <td className="px-3 py-2">{c.resolution}</td>
                        <td className="px-3 py-2">{c.cameras_count}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="input-field w-28"
                            value={editForm.equipment_price ?? c.equipment_price}
                            onChange={(e) => setEditForm({ ...editForm, equipment_price: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="input-field w-28"
                            value={editForm.install_fee ?? c.install_fee ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, install_fee: e.target.value ? Number(e.target.value) : null })}
                          />
                        </td>
                        <td className="px-3 py-2">{formatPrice(c.final_price)}</td>
                        <td className="px-3 py-2">
                          <select
                            className="input-field text-xs"
                            value={editForm.install_complexity ?? c.install_complexity}
                            onChange={(e) => setEditForm({ ...editForm, install_complexity: e.target.value })}
                          >
                            {complexityOptions.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="input-field w-40"
                            value={editForm.warranty_text ?? c.warranty_text}
                            onChange={(e) => setEditForm({ ...editForm, warranty_text: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={editForm.active ?? c.active}
                            onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                          />
                        </td>
                        <td className="px-3 py-2 space-x-2">
                          <button onClick={() => handleSaveCombo(c.id)} className="text-green-500 font-medium">
                            {t('admin.save')}
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 font-medium">
                            {t('admin.cancel')}
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2">{c.brand_name}</td>
                        <td className="px-3 py-2">{modeLabels[c.mode] || c.mode}</td>
                        <td className="px-3 py-2">{c.resolution}</td>
                        <td className="px-3 py-2">{c.cameras_count}</td>
                        <td className="px-3 py-2 font-semibold">{formatPrice(c.equipment_price)}</td>
                        <td className="px-3 py-2">{c.install_fee != null ? formatPrice(c.install_fee) : 'Global'}</td>
                        <td className="px-3 py-2">{formatPrice(c.final_price)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${complexityColors[c.install_complexity] || 'text-gray-600 bg-gray-50'}`}>
                            {c.install_complexity ? c.install_complexity.charAt(0).toUpperCase() + c.install_complexity.slice(1) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">{c.warranty_text}</td>
                        <td className="px-3 py-2">{c.active ? '✅' : '❌'}</td>
                        <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setEditingId(c.id);
                              setEditForm({
                                equipment_price: c.equipment_price,
                                install_fee: c.install_fee,
                                warranty_text: c.warranty_text,
                                active: c.active,
                                install_complexity: c.install_complexity,
                              });
                            }}
                            className="text-primary-500 font-medium text-xs"
                          >
                            {t('admin.edit')}
                          </button>
                          <button
                            onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {expandedId === c.id ? '▲' : '▼'}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                  {expandedId === c.id && editingId !== c.id && (
                    <tr>
                      <td colSpan={11} className="px-4 py-4 bg-gray-50">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <div className="flex items-start space-x-4 mb-4">
                              {c.image_url && (
                                <div className="w-32 h-24 bg-white rounded-lg overflow-hidden flex-shrink-0 border">
                                  <img src={c.image_url} alt={c.brand_name} className="w-full h-full object-contain p-2" />
                                </div>
                              )}
                              <div>
                                <h3 className="font-bold text-gray-900">{c.brand_name} - {c.cameras_count} cáms {c.resolution}</h3>
                                <p className="text-sm text-gray-500">{modeLabels[c.mode] || c.mode}</p>
                              </div>
                            </div>

                            {c.specs && Object.keys(c.specs).length > 0 && (
                              <div className="mb-4">
                                <h4 className="font-semibold text-gray-700 mb-2 text-sm">Ficha técnica</h4>
                                <table className="w-full text-xs">
                                  <tbody className="divide-y divide-gray-200">
                                    {Object.entries(c.specs).map(([key, value]) => (
                                      <tr key={key}>
                                        <td className="py-1.5 pr-2 text-gray-500 font-medium w-1/3">{key}</td>
                                        <td className="py-1.5 text-gray-900">
                                          <input
                                            className="input-field w-full text-xs py-1"
                                            defaultValue={value as string}
                                            onBlur={(e) => {
                                              const newSpecs = { ...c.specs, [key]: e.target.value };
                                              handleSaveSpec(c.id, 'specs', newSpecs);
                                            }}
                                          />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <div className="mb-4">
                              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Instalación</h4>
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-xs text-gray-500">Complejidad:</span>
                                <select
                                  className="input-field text-xs py-1 w-48"
                                  defaultValue={c.install_complexity}
                                  onChange={(e) => handleSaveSpec(c.id, 'install_complexity', e.target.value)}
                                >
                                  {complexityOptions.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">Valor x cámara:</span>
                                <input
                                  type="number"
                                  className="input-field text-xs py-1 w-28"
                                  defaultValue={c.install_fee ?? ''}
                                  onBlur={(e) => handleSaveSpec(c.id, 'install_fee', e.target.value ? Number(e.target.value) : null)}
                                  placeholder="Global"
                                />
                                <span className="text-xs text-gray-400">COP (vacío = usa valor global)</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            {c.included_items && c.included_items.length > 0 && (
                              <div className="mb-4">
                                <h4 className="font-semibold text-gray-700 mb-2 text-sm">Incluye</h4>
                                <div className="space-y-1">
                                  {(c.included_items as string[]).map((item: string, idx: number) => (
                                    <div key={idx} className="flex items-center space-x-2">
                                      <span className="text-green-500 text-xs">✓</span>
                                      <input
                                        className="input-field text-xs py-1 flex-1"
                                        defaultValue={item}
                                        onBlur={(e) => {
                                          const newItems = [...(c.included_items as string[])];
                                          newItems[idx] = e.target.value;
                                          handleSaveSpec(c.id, 'included_items', newItems);
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {c.storage_options && Object.keys(c.storage_options).length > 0 && (
                              <div className="mb-4">
                                <h4 className="font-semibold text-gray-700 mb-2 text-sm">Opciones de almacenamiento</h4>
                                <div className="space-y-1">
                                  {Object.entries(c.storage_options).map(([label, price]) => (
                                    <div key={label} className="flex items-center space-x-2 text-xs">
                                      <input
                                        className="input-field text-xs py-1 w-40"
                                        defaultValue={label}
                                        onBlur={(e) => {
                                          const newOpts: Record<string, number> = {};
                                          Object.entries(c.storage_options).forEach(([l, p]) => {
                                            const key = l === label ? e.target.value : l;
                                            newOpts[key] = p as number;
                                          });
                                          handleSaveSpec(c.id, 'storage_options', newOpts);
                                        }}
                                      />
                                      <span className="text-gray-400">=</span>
                                      <input
                                        type="number"
                                        className="input-field text-xs py-1 w-28"
                                        defaultValue={price as number}
                                        onBlur={(e) => {
                                          const newOpts = { ...c.storage_options, [label]: Number(e.target.value) };
                                          handleSaveSpec(c.id, 'storage_options', newOpts);
                                        }}
                                      />
                                      <span className="text-gray-400">COP</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="bg-white rounded-lg border p-3">
                              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Precio del combo</h4>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between font-bold">
                                  <span>Total:</span>
                                  <span className="text-primary-600">{formatPrice(c.final_price)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="card">
          <div className="space-y-4">
            {settings.map((s) => (
              <div key={s.key} className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-0">
                <div className="flex-1">
                  <label className="label">{settingLabels[s.key] || s.key}</label>
                  <p className="text-xs text-gray-400 mb-1">{s.description}</p>
                  {s.key === 'cancellation_policy' || s.key === 'urgency_message' ? (
                    <textarea
                      className="input-field"
                      defaultValue={s.value}
                      onBlur={(e) => handleSaveSetting(s.key, e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <input
                      className="input-field"
                      defaultValue={s.value}
                      onBlur={(e) => handleSaveSetting(s.key, e.target.value)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="card" style={{ isolation: 'isolate' }}>
          <div className="overflow-auto" style={{ maxHeight: '500px' }}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.date')}</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.changed_by')}</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.field')}</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.old_value')}</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">{t('admin.new_value')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {changelog.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs">{new Date(log.created_at).toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2">{log.user_name || 'Admin'}</td>
                  <td className="px-3 py-2 font-medium">{log.field_name}</td>
                  <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{log.old_value}</td>
                  <td className="px-3 py-2 font-semibold text-primary-600 max-w-xs truncate">{log.new_value}</td>
                </tr>
              ))}
              {changelog.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-400">{t('admin.no_data')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}
