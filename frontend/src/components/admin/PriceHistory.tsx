import { useState } from 'react';
import { api } from '../../api/client';
export default function PriceHistory(){
 const [rows,setRows]=useState<any[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 async function load(){if(busy)return;setBusy(true);setError('');try{setRows(await api.adminGetChangeLog());setLoaded(true);}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 return <details className="admin-editor admin-details" onToggle={e=>{if(e.currentTarget.open&&!loaded)void load();}}><summary>Historial de cambios y precios</summary><p>Últimos 100 cambios registrados. Los combos se editan en Combos; esta vista conserva la consulta de auditoría.</p>{error&&<p role="alert" className="admin-error">{error}</p>}{busy&&<p role="status">Cargando historial…</p>}{loaded&&!rows.length&&<p>Sin cambios registrados.</p>}<ul className="space-y-3">{rows.map(row=><li key={row.id} className="rounded-lg border p-3 text-sm break-words"><strong>{row.entity_type} #{row.entity_id} · {row.field_name}</strong><p>{row.old_value??'Sin valor'} → {row.new_value??'Sin valor'}</p><p className="text-gray-600">{row.user_name||'Administrador'} · {new Date(row.created_at).toLocaleString('es-CO')}</p></li>)}</ul>{loaded&&<button type="button" disabled={busy} onClick={()=>void load()}>Actualizar historial</button>}</details>;
}
