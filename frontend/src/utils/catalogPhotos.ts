import photos from '../data/catalog-photos.json';
type Combo = { specs?: Record<string, any>; name?: string; image_url?: string | null; brand_name?: string; mode?: string; resolution?: string; cameras_count?: number };
export function comboPhotos(combo: Combo): string[] {
  if (Array.isArray(combo.specs?.catalog_images)) return combo.specs.catalog_images;
  // An administrator's uploaded photograph always takes precedence.
  if (combo.image_url && !combo.image_url.endsWith('.svg')) {
    const original=photos.find(photo=>photo.url===combo.image_url);
    if(!original)return [combo.image_url];
    const folder=original.source.slice(0,original.source.lastIndexOf('/'));
    return photos.filter(photo=>photo.source.slice(0,photo.source.lastIndexOf('/'))===folder).map(photo=>photo.url);
  }
  const brand = /hikvision|hilook/i.test(combo.brand_name || '') ? 'Hikvision_Hilook/combos_Hilook/' : /dahua|cooper/i.test(combo.brand_name || '') ? 'Dahua/combos/' : '';
  if (!brand || combo.mode !== 'cableado' || combo.resolution !== '2MP') return [];
  const candidates = photos.filter(p => {
    const match = p.source.match(/\/(\d+)cam_2mp_dvr_(\d+)_?chanels/i);
    return p.source.startsWith(brand) && match && +match[1] === combo.cameras_count && +match[2] >= +match[1];
  });
  const normalize=(s:string)=>s.toLowerCase().replace(/_v\d+$/,'').replace(/[^a-z0-9]/g,'');
  // The original eight-camera HiLook folder says 4 channels; its photograph and
  // saved offer show the eight-channel DVR. Keep the original folder untouched.
  const aliases:Record<string,string>={'8cam2mpdvr8chanelsapp':'8cam2mpdvr4chanelsapp'};
  const name=normalize(combo.name||'');
  const exact=photos.find(p=>p.source.startsWith(brand) && normalize(p.source.split('/').slice(-2)[0]||'')===(aliases[name]||name));
  const chosen=exact||candidates[0];
  const folder=chosen?.source.substring(0,chosen.source.lastIndexOf('/'));
  return candidates.filter(p=>p.source.substring(0,p.source.lastIndexOf('/'))===folder).sort((a,b)=>a.source.localeCompare(b.source,undefined,{numeric:true})).map(p=>p.url);
}
export function productPhoto(product: { specs?: Record<string, any>; image_url?: string | null; name: string; description?: string }): string | undefined {
  if (Array.isArray(product.specs?.catalog_images)) return product.specs.catalog_images[0];
  if(product.image_url) return product.image_url;
  // Only explicit model references match. Generic seed records do not identify a SKU.
  const text=(product.name+' '+(product.description||'')).toLowerCase();
  return photos.find(p=>{
    const model=p.source.split('/').pop()?.split('_image_')[0].replace(/\.png$/i,'').toLowerCase();
    return model && /^(ipc-|ds-|ids-|hwd-)/i.test(model) && text.includes(model);
  })?.url;
}

export function comboTitle(combo: Combo): string {
  const named=combo.name?.match(/^(\d+)cam_(\d+)mp_dvr_(\d+)_?chanels(?:_(\d+)(tb|gb))?_app(?:_v(\d+))?$/i);
  if(named) return `${named[1]} cámaras · ${named[2]} MP · DVR ${named[3]} canales${named[4]?` · ${named[4]} ${named[5].toUpperCase()}`:''}${named[6]?` · variante ${named[6]}`:''}`;
  return combo.name || `${combo.cameras_count} cámaras · ${combo.resolution}`;
}
