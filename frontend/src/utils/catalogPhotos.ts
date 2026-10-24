import photos from '../data/catalog-photos.json';
type Combo = { image_url?: string | null; brand_name?: string; mode?: string; resolution?: string; cameras_count?: number };
export function comboPhotos(combo: Combo): string[] {
  // An administrator's uploaded photograph always takes precedence.
  if (combo.image_url && !combo.image_url.endsWith('.svg')) return [combo.image_url];
  const brand = /hikvision|hilook/i.test(combo.brand_name || '') ? 'Hikvision_Hilook/combos_Hilook/' : /dahua|cooper/i.test(combo.brand_name || '') ? 'Dahua/combos/' : '';
  if (!brand || combo.mode !== 'cableado' || combo.resolution !== '2MP') return [];
  const candidates = photos.filter(p => {
    const match = p.source.match(/\/(\d+)cam_2mp_dvr_(\d+)_?chanels/i);
    return p.source.startsWith(brand) && match && +match[1] === combo.cameras_count && +match[2] >= +match[1];
  });
  const folder=candidates[0]?.source.substring(0,candidates[0].source.lastIndexOf('/'));
  return candidates.filter(p=>p.source.substring(0,p.source.lastIndexOf('/'))===folder).sort((a,b)=>a.source.localeCompare(b.source,undefined,{numeric:true})).map(p=>p.url);
}
export function productPhoto(product: { image_url?: string | null; name: string; description?: string }): string | undefined {
  if(product.image_url) return product.image_url;
  // Only explicit model references match. Generic seed records do not identify a SKU.
  const text=(product.name+' '+(product.description||'')).toLowerCase();
  return photos.find(p=>{
    const model=p.source.split('/').pop()?.split('_image_')[0].replace(/\.png$/i,'').toLowerCase();
    return model && /^(ipc-|ds-|ids-|hwd-)/i.test(model) && text.includes(model);
  })?.url;
}
