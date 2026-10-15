import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import PriceHistory from '../../components/admin/PriceHistory';
import CatalogAdmin from '../../components/admin/CatalogAdmin';
export default function Prices(){
 const [visible,setVisible]=useState(false),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{api.adminGetSettings().then(rows=>{setVisible(rows.find((s:any)=>s.key==='show_product_prices')?.value==='true');setLoaded(true);}).catch(e=>setError(e.message));},[]);
 async function change(value:boolean){if(busy)return;const previous=visible;setVisible(value);setBusy(true);setError('');setNotice('');try{await api.adminUpdateSetting('show_product_prices',String(value));setVisible(value);setNotice(value?'Precios individuales publicados.':'Precios individuales ocultos. Los combos conservan sus precios.');}catch(e:any){setVisible(previous);setError(e.message);}finally{setBusy(false);}}
 return <div className="space-y-6"><section className="admin-editor"><h2>Precios públicos de productos individuales</h2><p>Desactivado inicialmente. Puedes editar los valores internos sin mostrarlos al visitante. Los precios de los combos se configuran exclusivamente en Combos.</p><label className="admin-check"><input type="checkbox" role="switch" checked={visible} disabled={!loaded||busy} onChange={e=>void change(e.target.checked)}/>Mostrar precios individuales en el frontend</label>{busy&&<p role="status">Guardando…</p>}{notice&&<p role="status" className="admin-notice">{notice}</p>}{error&&<p role="alert" className="admin-error">{error}</p>}</section><CatalogAdmin kind="productos" prices/><PriceHistory/></div>;
}
