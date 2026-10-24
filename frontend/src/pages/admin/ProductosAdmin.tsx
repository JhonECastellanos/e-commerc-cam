import { useState, useEffect, Fragment } from 'react';
import { api } from '../../api/client';

export default function ProductosAdmin() {
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<any>({ name: '', brand_id: '', description: '', price: null, instalacion_price: null, category: '', ganancia: null, link: '', sort_order: 0 });
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.adminGetProductsAdmin(),
      api.adminGetBrands(),
    ])
      .then(([p, b]) => { setProducts(p); setBrands(b); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (id: number) => {
    try {
      await api.adminUpdateProductAdmin(id, editForm);
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
      await api.adminCreateProduct(params);
      setShowCreate(false);
      setCreateForm({ name: '', brand_id: '', description: '', price: null, instalacion_price: null, category: '', ganancia: null, link: '', sort_order: 0 });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    try {
      await api.adminDeleteProduct(id);
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
        await api.adminUploadProductImage(id, file);
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
    price != null ? '$' + Math.round(price).toLocaleString('es-CO') + ' COP' : '—';

  if (loading) return <div className="text-center py-12 text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Administrar Productos</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary text-sm">
          {showCreate ? 'Cancelar' : '+ Nuevo Producto'}
        </button>
      </div>

      {showCreate && (
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Nuevo Producto</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label text-xs">Nombre</label>
              <input className="input-field w-full text-sm" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
            </div>
            <div>
              <label className="label text-xs">Marca</label>
              <select className="input-field w-full text-sm" value={createForm.brand_id} onChange={e => setCreateForm({...createForm, brand_id: e.target.value})}>
                <option value="">Ninguna</option>
                {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Categoría</label>
              <input className="input-field w-full text-sm" value={createForm.category} onChange={e => setCreateForm({...createForm, category: e.target.value})} />
            </div>
            <div>
              <label className="label text-xs">Precio</label>
              <input type="number" className="input-field w-full text-sm" value={createForm.price ?? ''} onChange={e => setCreateForm({...createForm, price: e.target.value ? Number(e.target.value) : null})} />
            </div>
            <div>
              <label className="label text-xs">Precio instalación</label>
              <input type="number" className="input-field w-full text-sm" value={createForm.instalacion_price ?? ''} onChange={e => setCreateForm({...createForm, instalacion_price: e.target.value ? Number(e.target.value) : null})} />
            </div>
            <div>
              <label className="label text-xs">Ganancia</label>
              <input type="number" className="input-field w-full text-sm" value={createForm.ganancia ?? ''} onChange={e => setCreateForm({...createForm, ganancia: e.target.value ? Number(e.target.value) : null})} />
            </div>
            <div>
              <label className="label text-xs">Link</label>
              <input className="input-field w-full text-sm" value={createForm.link} onChange={e => setCreateForm({...createForm, link: e.target.value})} />
            </div>
            <div>
              <label className="label text-xs">Orden</label>
              <input type="number" className="input-field w-full text-sm" value={createForm.sort_order} onChange={e => setCreateForm({...createForm, sort_order: Number(e.target.value)})} />
            </div>
          </div>
          <div>
            <label className="label text-xs">Descripción</label>
            <textarea className="input-field w-full text-sm" rows={2} value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} />
          </div>
          <button onClick={handleCreate} className="btn btn-primary text-sm mt-2">Crear Producto</button>
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
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Categoría</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Precio</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Instalación</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Ganancia</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Activo</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Imagen</th>
                <th className="text-left px-3 py-3 whitespace-nowrap sticky top-0 z-20 bg-gray-50 shadow-sm">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((p) => (
                <Fragment key={p.id}>
                  <tr className="hover:bg-gray-50">
                    {editingId === p.id ? (
                      <>
                        <td className="px-3 py-2">{p.id}</td>
                        <td className="px-3 py-2">{p.brand_name || '—'}</td>
                        <td className="px-3 py-2">
                          <input className="input-field w-40 text-xs" value={editForm.name ?? p.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        </td>
                        <td className="px-3 py-2">
                          <input className="input-field w-24 text-xs" value={editForm.category ?? p.category ?? ''} onChange={e => setEditForm({...editForm, category: e.target.value})} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" className="input-field w-28 text-xs" value={editForm.price ?? p.price ?? ''} onChange={e => setEditForm({...editForm, price: e.target.value ? Number(e.target.value) : null})} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" className="input-field w-28 text-xs" value={editForm.instalacion_price ?? p.instalacion_price ?? ''} onChange={e => setEditForm({...editForm, instalacion_price: e.target.value ? Number(e.target.value) : null})} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" className="input-field w-24 text-xs" value={editForm.ganancia ?? p.ganancia ?? ''} onChange={e => setEditForm({...editForm, ganancia: e.target.value ? Number(e.target.value) : null})} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={editForm.active ?? p.active} onChange={e => setEditForm({...editForm, active: e.target.checked})} />
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => handleUpload(p.id)} className="text-xs text-primary-500 font-medium">
                            {uploadingId === p.id ? 'Subiendo...' : p.image_url ? 'Cambiar' : 'Subir'}
                          </button>
                        </td>
                        <td className="px-3 py-2 space-x-2">
                          <button onClick={() => handleSave(p.id)} className="text-green-500 font-medium text-xs">Guardar</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 font-medium text-xs">Cancelar</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-gray-400 text-xs">{p.id}</td>
                        <td className="px-3 py-2">{p.brand_name || <span className="text-gray-300">—</span>}</td>
                        <td className="px-3 py-2 font-medium">{p.name}</td>
                        <td className="px-3 py-2 text-xs">{p.category || '—'}</td>
                        <td className="px-3 py-2 font-semibold">{formatPrice(p.price)}</td>
                        <td className="px-3 py-2 text-xs">{formatPrice(p.instalacion_price)}</td>
                        <td className="px-3 py-2">{p.ganancia ? formatPrice(p.ganancia) : <span className="text-gray-300">—</span>}</td>
                        <td className="px-3 py-2">{p.active ? '✅' : '❌'}</td>
                        <td className="px-3 py-2">
                          {p.image_url ? (
                            <div className="flex items-center space-x-1">
                              <img src={p.image_url} alt="" className="w-8 h-8 object-contain rounded border" />
                              <button onClick={() => handleUpload(p.id)} className="text-xs text-primary-500 font-medium ml-1">
                                {uploadingId === p.id ? '...' : '✎'}
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleUpload(p.id)} className="text-xs text-primary-500 font-medium">
                              {uploadingId === p.id ? 'Subiendo...' : 'Subir imagen'}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                          <button onClick={() => { setEditingId(p.id); setEditForm({ name: p.name, category: p.category, price: p.price, instalacion_price: p.instalacion_price, ganancia: p.ganancia, active: p.active }); }} className="text-primary-500 font-medium text-xs">
                            Editar
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="text-red-500 font-medium text-xs">
                            Eliminar
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                  {editingId !== p.id && p.description && (
                    <tr className="hover:bg-gray-50">
                      <td colSpan={10} className="px-3 py-1 text-xs text-gray-500 pl-10">{p.description}</td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-gray-400">No hay productos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}