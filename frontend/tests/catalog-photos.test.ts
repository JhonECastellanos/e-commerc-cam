import { describe, expect, it } from 'vitest';
import { comboPhotos, productPhoto } from '../src/utils/catalogPhotos';
import { roomElevation } from '../src/smart-home/architecture';
import { imagePath } from '../src/components/public/CatalogImage';
describe('real catalog photographs and architecture',()=>{
  it('matches brand, camera count, resolution and mode instead of unrelated kits',()=>{
    expect(comboPhotos({brand_name:'Dahua / Cooper',mode:'cableado',resolution:'2MP',cameras_count:4}).length).toBe(8);
    expect(comboPhotos({brand_name:'Hikvision / HiLook',mode:'cableado',resolution:'2MP',cameras_count:8}).length).toBe(3);
    expect(comboPhotos({brand_name:'Dahua / Cooper',mode:'solar',resolution:'2MP',cameras_count:4})).toEqual([]);
    expect(comboPhotos({brand_name:'Dahua / Cooper',mode:'cableado',resolution:'4MP',cameras_count:4})).toEqual([]);
  });
  it('preserves admin uploads, resolves Windows originals, and does not invent SKUs',()=>{
    expect(comboPhotos({image_url:'/api/uploads/kit.webp'})).toEqual(['/api/uploads/kit.webp']);
    expect(imagePath('D:\\Fotos\\CATALOGO\\Dahua\\combos\\4cam_2mp_dvr_8chanels_1tb_app\\1.webp')).toMatch(/^\/catalogo\//);
    expect(productPhoto({name:'Cámara Tubular 2MP'})).toBeUndefined();
    expect(productPhoto({name:'IPC-D120HAA-LU(F)(_SX)'})).toMatch(/^\/catalogo\//);
  });
  it('positions upper rooms without changing advisory device coordinates',()=>{
    expect(roomElevation('casa','cocina')).toBe(3.2);
    expect(roomElevation('casa','sala')).toBe(0);
    expect(roomElevation('apartamento','cocina')).toBe(0);
  });
});
