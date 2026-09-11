import { useState, useEffect, Fragment } from 'react';
import { api } from '../../api/client';

export default function CombosAdmin() {
  const [combos, setCombos] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<any>({ name: '', brand_id: '', mode: 'cableado', resolution: '2MP', cameras_count: 4, equipment_price: 0, install_fee: null, level: '', categoria: 'Combo', instalacion_incluida: true, ganancia: null, link: '' });
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.adminGetCombosAdmin(),
      api.adminGetBrands(),
    ])
      .then(([c, b]) => { setCombos(c); setBrands(b); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (id: number) => {
    try {
      await api.adminUpdateComboAdmin(id, editForm);
      setEditingId(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreate = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(createForm).forEach(([k, v]) => {
        if (v !== null && v !== '') params.append(k, String(v));
      });
      await api.adminCreateCombo(params);
      setShowCreate(false);
      setCreateForm({ name: '', brand_id: '', mode: 'cableado', resolution: '2MP', cameras_count: 4, equipment_price: 0, install_fee: null, level: '', categoria: 'Combo', instalacion_incluida: true, ganancia: null, link: '' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este combo?')) return;
    try {
      await api.adminDeleteCombo(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpload = async (id: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploadingId(id);
      try {
        await api.adminUploadComboImage(id, file);
        loadData();
      } catch (err: any) {
        alert(err.message);
      } finally {
        setUploadingId(null);
      }
    };
    input.click();
  };

  const formatPrice = (price: number) =>
    '$' + Math.round(price).toLocaleString('es-CO') + ' COP';

  if (loading) return <div className="text-center py-12 text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Administrar Combos</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary text-sm">
          {showCreate ? 'Cancelar' : '+ Nuevo Combo'}
        </button>
      </div>

      {showCreate && (
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Nuevo Combo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label text-xs">Nombre</label>
              <input className="input-field w-full text-sm" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
            </div>
            <div>
              <label className="label text-xs">Marca</label>
              <select className="input-field w-full text-sm" value={createForm.brand_id} onChange={e => setCreateForm({...createForm, brand_id: e.target.value})}>
                <option value="">Seleccionar</option>
                {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Modo</label>
              <select className="input-field w-full text-sm" value={createForm.mode} onChange={e => setCreateForm({...createForm, mode: e.target.value})}>
                <option value="cableado">Cableado</option>
                <option value="inalambrico">Inalámbrico</option>
                <option value="hibrido">Híbrido</option>
                <option value="solar">Solar</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Resolución</label>
              <select className="input-field w-full text-sm" value={createForm.resolution} onChange={e => setCreateForm({...createForm, resolution: e.target.value})}>
                <option value="2MP">2MP</option>
                <option value="3MP">3MP</option>
                <option value="5MP">5MP</option>
                <option value="8MP">8MP</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Cámaras</label>
              <input type="number" className="input-field w-full text-sm" value={createForm.cameras_count} onChange={e => setCreateForm({...createForm, cameras_count: Number(e.target.value)})} />
            </div>
            <div>
              <label className="label text-xs">Precio equipo</label>
              <input type="number" className="input-field w-full text-sm" value={createForm.equipment_price} onChange={e => setCreateForm({...createForm, equipment_price: Number(e.target.value)})} />
            </div>
            <div>
              <label className="label text-xs">Instalación x cámara</label>
              <input type="number" className="input-field w-full text-sm" value={createForm.install_fee ?? ''} onChange={e => setCreateForm({...createForm, install_fee: e.target.value ? Number(e.target.value) : null})} />
            </div>
            <div>
              <label className="label text-xs">Nivel</label>
              <select className="input-field w-full text-sm" value={createForm.level} onChange={e => setCreateForm({...createForm, level: e.target.value})}>
                <option value="">Ninguno</option>
                <option value="economico">Económico</option>
                <option value="intermedio">Intermedio</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Categoría</label>
              <input className="input-field w-full text-sm" value={createForm.categoria} onChange={e => setCreateForm({...createForm, categoria: e.target.value})} />
            </div>
            <div>
              <label className="label text-xs">Ganancia</label>
              <input type="number" className="input-field w-full text-sm" value={createForm.ganancia ?? ''} onChange={e => setCreateForm({...createForm, ganancia: e.target.value ? Number(e.target.value) : null})} />
            </div>
            <div>
              <label className="label text-xs">Link</label>
              <input className="input-field w-full text-sm" value={createForm.link} onChange={e => setCreateForm({...createForm, link: e.target.value})} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" checked={createForm.instalacion_incluida} onChange={e => setCreateForm({...createForm, instalacion_incluida: e.target.checked})} />
                <span>Instalación incluida</span>
              </label>
            </div>
          </div>
          <button onClick={handleCreate} className="btn btn-primary text-sm mt-2">Crear Combo</button>
        </div>
      )}

      <div className="card" style={{ isolation: 'isolate' }}>
        <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">ID</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Marca</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Nombre</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Nivel</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Categoría</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Precio</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Ganancia</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Instalación</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Activo</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Imagen</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {combos.map((c) => (
                <Fragment key={c.id}>
                  <tr className="hover:bg-gray-50">
                    {editingId === c.id ? (
                      <>
                        <td className="px-3 py-2">{c.id}</td>
                        <td className="px-3 py-2">{c.brand_name}</td>
                        <td className="px-3 py-2">
                          <input className="input-field w-40 text-xs" value={editForm.name ?? c.name ?? ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        </td>
                        <td className="px-3 py-2">
                          <select className="input-field text-xs" value={editForm.level ?? c.level ?? ''} onChange={e => setEditForm({...editForm, level: e.target.value || null})}>
                            <option value="">Ninguno</option>
                            <option value="economico">Económico</option>
                            <option value="intermedio">Intermedio</option>
                            <option value="premium">Premium</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input className="input-field w-24 text-xs" value={editForm.categoria ?? c.categoria ?? ''} onChange={e => setEditForm({...editForm, categoria: e.target.value})} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" className="input-field w-28 text-xs" value={editForm.equipment_price ?? c.equipment_price} onChange={e => setEditForm({...editForm, equipment_price: Number(e.target.value)})} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" className="input-field w-24 text-xs" value={editForm.ganancia ?? c.ganancia ?? ''} onChange={e => setEditForm({...editForm, ganancia: e.target.value ? Number(e.target.value) : null})} />
                        </td>
                        <td className="px-3 py-2">
                          <label className="flex items-center space-x-1 text-xs">
                            <input type="checkbox" checked={editForm.instalacion_incluida ?? c.instalacion_incluida} onChange={e => setEditForm({...editForm, instalacion_incluida: e.target.checked})} />
                            <span>{editForm.instalacion_incluida ?? c.instalacion_incluida ? 'Sí' : 'No'}</span>
                          </label>
                        </td>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={editForm.active ?? c.active} onChange={e => setEditForm({...editForm, active: e.target.checked})} />
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => handleUpload(c.id)} className="text-xs text-primary-500 font-medium">
                            {uploadingId === c.id ? 'Subiendo...' : c.image_url ? 'Cambiar' : 'Subir'}
                          </button>
                        </td>
                        <td className="px-3 py-2 space-x-2">
                          <button onClick={() => handleSave(c.id)} className="text-green-500 font-medium text-xs">Guardar</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 font-medium text-xs">Cancelar</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-gray-400 text-xs">{c.id}</td>
                        <td className="px-3 py-2">{c.brand_name}</td>
                        <td className="px-3 py-2 font-medium">{c.name || `${c.cameras_count}cáms ${c.resolution} ${c.mode}`}</td>
                        <td className="px-3 py-2">
                          {c.level ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              c.level === 'economico' ? 'text-green-600 bg-green-50' :
                              c.level === 'intermedio' ? 'text-yellow-600 bg-yellow-50' :
                              'text-purple-600 bg-purple-50'
                            }`}>{c.level}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs">{c.categoria || '—'}</td>
                        <td className="px-3 py-2 font-semibold">{formatPrice(c.equipment_price)}</td>
                        <td className="px-3 py-2">{c.ganancia ? formatPrice(c.ganancia) : <span className="text-gray-300">—</span>}</td>
                        <td className="px-3 py-2 text-xs">{c.instalacion_incluida ? 'Incluida' : 'No incluye'}</td>
                        <td className="px-3 py-2">{c.active ? '✅' : '❌'}</td>
                        <td className="px-3 py-2">
                          {c.image_url ? (
                            <div className="flex items-center space-x-1">
                              <img src={c.image_url} alt="" className="w-8 h-8 object-contain rounded border" />
                              <button onClick={() => handleUpload(c.id)} className="text-xs text-primary-500 font-medium ml-1">
                                {uploadingId === c.id ? '...' : '✎'}
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleUpload(c.id)} className="text-xs text-primary-500 font-medium">
                              {uploadingId === c.id ? 'Subiendo...' : 'Subir imagen'}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                          <button onClick={() => { setEditingId(c.id); setEditForm({ name: c.name, level: c.level, categoria: c.categoria, equipment_price: c.equipment_price, ganancia: c.ganancia, instalacion_incluida: c.instalacion_incluida, active: c.active }); }} className="text-primary-500 font-medium text-xs">
                            Editar
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="text-red-500 font-medium text-xs">
                            Eliminar
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                </Fragment>
              ))}
              {combos.length === 0 && (
                <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-400">No hay combos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}