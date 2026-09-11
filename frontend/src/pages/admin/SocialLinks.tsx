import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import DataTable from '../../components/admin/DataTable';

export default function SocialLinks() {
  const { t } = useTranslation();
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ platform: 'whatsapp', url: '', label: '', active: true, sort_order: 0 });

  const loadLinks = () => {
    setLoading(true);
    api.adminGetSocialLinks()
      .then(setLinks)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLinks(); }, []);

  const handleSave = async () => {
    try {
      if (editing) {
        await api.adminUpdateSocialLink(editing.id, form);
      } else {
        await api.adminCreateSocialLink(form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ platform: 'whatsapp', url: '', label: '', active: true, sort_order: 0 });
      loadLinks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (link: any) => {
    if (!confirm(t('admin.confirm_delete'))) return;
    await api.adminDeleteSocialLink(link.id);
    loadLinks();
  };

  const handleEdit = (link: any) => {
    setEditing(link);
    setForm({
      platform: link.platform,
      url: link.url,
      label: link.label || '',
      active: link.active,
      sort_order: link.sort_order,
    });
    setShowForm(true);
  };

  const columns = [
    { key: 'platform', label: 'Plataforma' },
    { key: 'url', label: 'URL', render: (v: string) => <span className="text-xs truncate max-w-[200px] inline-block">{v}</span> },
    { key: 'label', label: 'Etiqueta' },
    { key: 'active', label: t('admin.active'), render: (v: boolean) => v ? '✅' : '❌' },
    { key: 'sort_order', label: 'Orden' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.social')}</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ platform: 'whatsapp', url: '', label: '', active: true, sort_order: 0 }); }} className="btn-primary">
          + {t('admin.add')}
        </button>
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h3 className="font-bold">{editing ? 'Editar enlace' : 'Nuevo enlace'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Plataforma</label>
              <select className="input-field" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                <option value="whatsapp">WhatsApp</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="other">Otra</option>
              </select>
            </div>
            <div>
              <label className="label">URL</label>
              <input className="input-field" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </div>
            <div>
              <label className="label">Etiqueta</label>
              <input className="input-field" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </div>
            <div>
              <label className="label">Orden</label>
              <input className="input-field" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <label className="text-sm">{t('admin.active')}</label>
          </div>
          <div className="flex space-x-2">
            <button onClick={handleSave} className="btn-primary">{t('admin.save')}</button>
            <button onClick={() => setShowForm(false)} className="btn-outline">{t('admin.cancel')}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : (
        <div className="card">
          <DataTable columns={columns} data={links} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      )}
    </div>
  );
}
