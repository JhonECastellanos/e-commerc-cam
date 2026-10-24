import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

export default function CoverageAreas() {
  const { t } = useTranslation();
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');

  const loadAreas = () => {
    setLoading(true);
    api.adminGetCoverage()
      .then(setAreas)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAreas(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await api.adminCreateCoverage(newName.trim());
      setNewName('');
      loadAreas();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggle = async (id: number) => {
    await api.adminToggleCoverage(id);
    loadAreas();
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('admin.confirm_delete'))) return;
    await api.adminDeleteCoverage(id);
    loadAreas();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('admin.coverage')}</h1>

      <div className="card">
        <div className="flex space-x-2 mb-4">
          <input
            className="input-field flex-1"
            placeholder="Nuevo municipio..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} className="btn-primary">
            + {t('admin.add')}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {areas.map((area) => (
              <div
                key={area.id}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                  area.active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggle(area.id)}
                    className={`w-3 h-3 rounded-full ${area.active ? 'bg-green-500' : 'bg-gray-300'}`}
                    title={area.active ? 'Activo' : 'Inactivo'}
                  />
                  <span className={`text-sm ${area.active ? 'text-gray-900' : 'text-gray-400'}`}>
                    {area.name}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(area.id)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
            {areas.length === 0 && (
              <p className="text-center text-gray-400 col-span-full py-8">{t('admin.no_data')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
