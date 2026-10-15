import { useState, useEffect } from 'react';
import { api } from '../../api/client';

export default function AdminMedia() {
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const [demoSlides,setDemoSlides]=useState('house,apartment,functions,recording');
  const [tab, setTab] = useState<'banners' | 'marcas' | 'config'>('banners');
  const [banners, setBanners] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<number | string | null>(null);
  const [editingBannerId, setEditingBannerId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', subtitle: '', video_url: '', link_url: '', position: 1 });

  async function mutate(action:()=>Promise<void>){if(saving)return;setSaving(true);setError('');try{await action();}catch(e:any){setError(e.message);}finally{setSaving(false);}}

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.adminGetBanners(),
      api.adminGetBrands(),
      api.adminGetSettings(),
    ]).then(([b, br, s]) => {
      setBanners(b);
      setBrands(br);
      setSettings(s);
      setDemoSlides(s.find((item:any)=>item.key==='hero_demo_slides')?.value ?? 'house,apartment,functions,recording');
    }).catch((err:any)=>setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleUploadBannerImage = async (id: number) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      setUploading(`banner-${id}`);
      try {
        await api.adminUploadBannerImage(id, file);
        loadData();
      } catch (err: any) { setError(err.message); }
      finally { setUploading(null); }
    };
    input.click();
  };

  const handleUploadBrandLogo = async (id: number) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      setUploading(`brand-${id}`);
      try {
        await api.adminUploadBrandLogo(id, file);
        loadData();
      } catch (err: any) { setError(err.message); }
      finally { setUploading(null); }
    };
    input.click();
  };

  const handleUploadAboutImage = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      setUploading('about');
      try {
        const token = sessionStorage.getItem('admin_token');
        const formData = new FormData(); formData.append('file', file);
        const res = await fetch('/api/admin/upload-about-image', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail || 'No fue posible subir la imagen');
        }
        loadData();
      } catch (err: any) { setError(err.message); }
      finally { setUploading(null); }
    };
    input.click();
  };

  const handleDeleteBanner = async (id: number) => {
    if (!window.confirm('¿Eliminar este banner?')) return;
    try {
      await api.adminDeleteBanner(id);
      loadData();
    } catch (err: any) { setError(err.message); }
  };

  const handleEditBanner = (banner: any) => {
    setEditingBannerId(banner.id);
    setEditForm({
      title: banner.title,
      subtitle: banner.subtitle || '',
      video_url: banner.video_url || '',
      link_url: banner.link_url || '',
      position: banner.position,
      active: banner.active,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingBannerId) return;
    try {
      const data: any = {};
      if(!editForm.title?.trim()){setError('El título es obligatorio');return;}
      if (editForm.active !== undefined) data.active = editForm.active;
      if (editForm.title !== undefined) data.title = editForm.title;
      if (editForm.subtitle !== undefined) data.subtitle = editForm.subtitle || null;
      if (editForm.video_url !== undefined) data.video_url = editForm.video_url || null;
      if (editForm.link_url !== undefined) data.link_url = editForm.link_url || null;
      if (editForm.position !== undefined) data.position = editForm.position;
      await api.adminUpdateBanner(editingBannerId, data);
      setEditingBannerId(null);
      loadData();
    } catch (err: any) { setError(err.message); }
  };

  const handleCreateBanner = async () => {
    if (!createForm.title.trim()) { setError('El título es obligatorio'); return; }
    try {
      await api.adminCreateBanner({
        title: createForm.title,
        subtitle: createForm.subtitle || undefined,
        video_url: createForm.video_url || undefined,
        link_url: createForm.link_url || undefined,
        position: createForm.position || banners.length + 1,
      });
      setShowCreateForm(false);
      setCreateForm({ title: '', subtitle: '', video_url: '', link_url: '', position: banners.length + 1 });
      loadData();
    } catch (err: any) { setError(err.message); }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    try {
      await api.adminUpdateSetting(key, value);
      loadData();
    } catch (err: any) { setError(err.message); }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Cargando...</div>;

  const aboutSetting = settings.find((s: any) => s.key === 'about_image_url');
  const relevantSettings = settings.filter((s: any) =>
    ['urgency_message', 'labor_warranty_months', 'whatsapp_number', 'business_name', 'business_nit', 'business_contact', 'install_fee_per_camera', 'install_fee_per_camera_wireless', 'vat_rate', 'cancellation_policy', 'installation_lead_days', 'balance_payment_term', 'about_image_url'].includes(s.key)
  );

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=0&mute=1&controls=1&rel=0` : null;
  };

  return (
    <fieldset disabled={saving || uploading !== null} className="space-y-6 min-w-0">
      <h1 className="text-2xl font-bold text-gray-900">Multimedia</h1>
      {error&&<p role="alert" className="admin-error">{error}</p>}
      <datalist id="banner-video-library">{videoLibrary.map(video=><option key={video.url} value={video.url}>{video.label}</option>)}</datalist>

      <div className="flex space-x-2 border-b">
        {(['banners', 'marcas', 'config'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary-500 text-primary-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'banners' ? 'Banners' : t === 'marcas' ? 'Marcas' : 'Configuración visual'}
          </button>
        ))}
      </div>

      {tab === 'banners' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">{banners.filter(b=>b.active).length} banners activos. Añade, ordena o reemplaza sus imágenes y vídeos.</p>
            <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-primary text-sm px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600">
              {showCreateForm ? 'Cancelar' : '+ Nuevo banner'}
            </button>
          </div>

          <details className="admin-details card p-4"><summary>Demostraciones incluidas en el carrusel</summary><p>Elige cuáles acompañan a tus banners comerciales. Las demos interactivas siguen disponibles en Casa inteligente.</p><div className="admin-checks">{demoOptions.map(option=><label className="admin-check" key={option.id}><input type="checkbox" checked={demoSlides.split(',').includes(option.id)} onChange={e=>{const selected=new Set(demoSlides.split(',').filter(Boolean));e.target.checked?selected.add(option.id):selected.delete(option.id);setDemoSlides([...selected].join(','));}}/>{option.label}</label>)}</div><button disabled={saving} className="btn btn-primary" onClick={async()=>{if(saving)return;setSaving(true);setError('');try{await api.adminUpdateSetting('hero_demo_slides',demoSlides);}catch(e:any){setError(e.message);}finally{setSaving(false);}}}>{saving?'Guardando…':'Guardar selección de demos'}</button></details>
          {showCreateForm && (
            <div className="card bg-gray-50 border p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Nuevo banner</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Título *</label>
                  <input className="input-field w-full" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} placeholder="Ej: Seguridad profesional" />
                </div>
                <div>
                  <label className="label text-xs">Subtítulo</label>
                  <input className="input-field w-full" value={createForm.subtitle} onChange={(e) => setCreateForm({ ...createForm, subtitle: e.target.value })} placeholder="Ej: Instalación en 24 horas" />
                </div>
                <div>
                  <label className="label text-xs">URL de vídeo (YouTube o MP4)</label>
                  <input className="input-field w-full" list="banner-video-library" value={createForm.video_url} onChange={(e) => setCreateForm({ ...createForm, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div>
                  <label className="label text-xs">URL de enlace</label>
                  <input className="input-field w-full" value={createForm.link_url} onChange={(e) => setCreateForm({ ...createForm, link_url: e.target.value })} placeholder="/catalogo" />
                </div>
                <div>
                  <label className="label text-xs">Posición</label>
                  <input type="number" className="input-field w-full" value={createForm.position} onChange={(e) => setCreateForm({ ...createForm, position: parseInt(e.target.value) || 1 })} min={1} />
                </div>
              </div>
              <div className="flex space-x-2">
                <button onClick={()=>void mutate(handleCreateBanner)} className="btn bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600">Crear banner</button>
                <button onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file'; input.accept = 'image/*';
                  input.onchange = async () => {
                    const file = input.files?.[0]; if (!file) return;
                    try {
                      await api.adminCreateBannerWithImage(createForm, file);
                      setShowCreateForm(false);
                      setCreateForm({ title: '', subtitle: '', video_url: '', link_url: '', position: banners.length + 1 });
                      loadData();
                    } catch (err: any) { setError(err.message); }
                  };
                  input.click();
                }} className="btn bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300">Crear con imagen</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {banners.sort((a: any, b: any) => a.position - b.position).map((b: any) => (
              <div key={b.id} className="border rounded-lg overflow-hidden bg-white">
                <div className="h-40 bg-gray-100 relative group">
                  {b.video_url ? (
                    <div className="relative w-full h-full">
                      {getYouTubeEmbedUrl(b.video_url) ? <iframe src={getYouTubeEmbedUrl(b.video_url)!} className="w-full h-full" title={b.title} loading="lazy" allow="encrypted-media"/> : <video src={b.video_url} controls muted playsInline preload="metadata" className="w-full h-full object-cover"/>}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                    </div>
                  ) : b.image_url ? (
                    <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">Sin imagen</div>
                  )}
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    #{b.position}
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {editingBannerId === b.id ? (
                    <div className="space-y-2">
                      <label className="admin-check"><input type="checkbox" checked={Boolean(editForm.active)} onChange={e=>setEditForm({...editForm,active:e.target.checked})}/>Visible en el carrusel</label>
                      <label>Título del banner<input className="input-field text-xs w-full" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Título" /></label>
                      <label>Subtítulo del banner<input className="input-field text-xs w-full" value={editForm.subtitle} onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })} placeholder="Subtítulo" /></label>
                      <label>Vídeo del banner<input className="input-field text-xs w-full" aria-label="URL de vídeo del banner" list="banner-video-library" value={editForm.video_url} onChange={(e) => setEditForm({ ...editForm, video_url: e.target.value })} placeholder="URL de vídeo YouTube o MP4" /></label>
                      <label>Enlace del banner<input className="input-field text-xs w-full" value={editForm.link_url} onChange={(e) => setEditForm({ ...editForm, link_url: e.target.value })} placeholder="URL de enlace" /></label>
                      <label>Posición del banner<input type="number" className="input-field text-xs w-20" value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: parseInt(e.target.value) || 1 })} min={1} /></label>
                      <div className="flex space-x-2">
                        <button onClick={()=>void mutate(handleSaveEdit)} className="text-xs text-green-600 font-medium">Guardar</button>
                        <button onClick={() => setEditingBannerId(null)} className="text-xs text-gray-500 font-medium">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-sm truncate">{b.title || 'Sin título'}</p>
                      {b.subtitle && <p className="text-xs text-gray-500 truncate">{b.subtitle}</p>}
                      {b.video_url && <p className="text-xs text-blue-500 truncate">Video: {b.video_url}</p>}
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleEditBanner(b)} className="text-xs text-primary-500 font-medium">Editar</button>
                        <button onClick={() => handleUploadBannerImage(b.id)} className="text-xs text-primary-500 font-medium">
                          {uploading === `banner-${b.id}` ? 'Subiendo...' : b.image_url ? 'Cambiar imagen' : 'Subir imagen'}
                        </button>
                        <button onClick={()=>void mutate(()=>handleDeleteBanner(b.id))} className="text-xs text-red-500 font-medium">Eliminar</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
            {banners.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No hay banners. Crea un banner con el botón "+ Nuevo banner".
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'marcas' && (
        <div className="card space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {brands.map((b: any) => (
              <div key={b.id} className="border rounded-lg p-3 text-center bg-white">
                <div className="h-16 flex items-center justify-center mb-2">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-xs">
                      {b.name.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium truncate">{b.name}</p>
                <button onClick={() => handleUploadBrandLogo(b.id)} className="text-xs text-primary-500 font-medium mt-1">
                  {uploading === `brand-${b.id}` ? '...' : b.logo_url ? 'Cambiar logo' : 'Subir logo'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'config' && (
        <div className="card space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Foto del técnico (sección Conócenos)</h3>
            <p className="text-xs text-gray-500 mb-3">Esta imagen se muestra en la sección "Conócenos" de la página de inicio.</p>
            <div className="flex items-start space-x-4">
              <div className="w-40 h-32 bg-gray-100 rounded-lg border overflow-hidden flex-shrink-0">
                {aboutSetting?.value ? (
                  <img src={aboutSetting.value} alt="Técnico" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-xs">Sin imagen</div>
                )}
              </div>
              <div>
                <button onClick={handleUploadAboutImage} className="btn btn-primary text-sm px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600">
                  {uploading === 'about' ? 'Subiendo...' : aboutSetting?.value ? 'Cambiar imagen' : 'Subir imagen'}
                </button>
                {aboutSetting && (
                  <p className="text-xs text-gray-500 mt-2">URL actual: {aboutSetting.value}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-4">Configuración del sistema</h3>
            <div className="space-y-4">
              {relevantSettings.filter((s: any) => s.key !== 'about_image_url').map((s: any) => (
                <div key={s.key} className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <label className="label text-sm">{getSettingLabel(s.key)}</label>
                    <p className="text-xs text-gray-500 mb-1">{s.description}</p>
                    {['cancellation_policy', 'urgency_message'].includes(s.key) ? (
                      <textarea
                        className="input-field w-full"
                        defaultValue={s.value}
                        onBlur={(e) => {if(e.target.value!==s.value)void mutate(()=>handleSaveSetting(s.key,e.target.value));}}
                        rows={2}
                      />
                    ) : (
                      <input
                        className="input-field w-full"
                        defaultValue={s.value}
                        onBlur={(e) => {if(e.target.value!==s.value)void mutate(()=>handleSaveSetting(s.key,e.target.value));}}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </fieldset>
  );
}

function getSettingLabel(key: string): string {
  const labels: Record<string, string> = {
    install_fee_per_camera: 'Valor instalación por cámara (cableado/híbrido/solar)',
    install_fee_per_camera_wireless: 'Valor instalación por cámara (inalámbrico)',
    vat_rate: '% IVA',
    business_name: 'Nombre del negocio',
    business_nit: 'NIT del negocio',
    business_contact: 'Teléfono de contacto',
    cancellation_policy: 'Política de cancelación',
    installation_lead_days: 'Plazo de instalación (días)',
    labor_warranty_months: 'Meses de garantía de mano de obra',
    balance_payment_term: 'Término de pago del saldo',
    urgency_message: 'Mensaje de urgencia (banner)',
    about_image_url: 'URL imagen del técnico (Conócenos)',
    whatsapp_number: 'Número de WhatsApp',
  };
  return labels[key] || key;
}

const videoLibrary=[
 {label:'Seguridad · YouTube original',url:'https://www.youtube.com/watch?v=CJ3dAAna7jQ'},
 {label:'Casa inteligente',url:'/banner-assets/casa-loop.mp4'},
 {label:'Apartamento inteligente',url:'/banner-assets/apartamento-loop.mp4'},
 {label:'Funciones de cámaras',url:'/banner-assets/functions-loop.mp4'},
 {label:'Grabación y almacenamiento',url:'/banner-assets/recording-loop.mp4'},
];
const demoOptions=[{id:'house',label:'Casa 3D'},{id:'apartment',label:'Apartamento 3D'},{id:'functions',label:'Funciones de cámaras'},{id:'recording',label:'Grabación y almacenamiento'}];
