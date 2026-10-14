import { describe, expect, it } from 'vitest';
import { cameraQuestions, cleanCameraAnswers, readCameraProfile, recommendCameras } from '../src/utils/cameraRecommendation';
import { configuredWhatsapp, whatsappURL } from '../src/utils/whatsapp';
import { commercialProducts } from '../src/utils/productCatalog';
import metadata from '../src/data/catalog-products.json';
import photos from '../src/data/catalog-photos.json';
import type { Combo } from '../src/utils/commercial';

const combo=(id:number,count:number,resolution='2MP'):Combo=>({id,cameras_count:count,brand_name:'Hikvision',resolution,mode:'cableado',final_price:count*100000});
describe('Selección de cámaras',()=>{
  it('omite preguntas y respuestas de otro inmueble',()=>{
    const answer={property:'oficina',environment:'interior',units:30,perimeter:'jardin',accesses:'2'};
    expect(cameraQuestions(answer).map(q=>q.key)).toContain('accesses');
    expect(cameraQuestions(answer).map(q=>q.key)).not.toContain('perimeter');
    expect(cleanCameraAnswers(answer)).toEqual({property:'oficina',environment:'interior',accesses:'2'});
    expect(cameraQuestions({property:'casa',environment:'interior'}).map(q=>q.key)).not.toContain('perimeter');
    expect(cameraQuestions({property:'edificio'}).map(q=>q.key)).toContain('units');
  });
  it('usa el combo menor que cubre las áreas; calidad no aumenta cámaras',()=>{
    const result=recommendCameras({property:'casa',areas:3,priority:'calidad',environment:'ambos',existing:'no',connectivity:'cable'},[combo(1,8,'8MP'),combo(2,4),combo(3,4,'4MP')]);
    expect(result.custom).toBe(false);
    expect(result.compatible.map(c=>c.id)).toEqual([3,2]);
    expect(result.reasons.join(' ')).toContain('3 áreas');
  });
  it('no vende un combo como solución de varias viviendas o equipos no revisados',()=>{
    for(const answers of [{property:'edificio',units:40,areas:4},{existing:'si',areas:4},{areas:18},{areas:4,connectivity:'ninguna'}]){
      const result=recommendCameras(answers,[combo(1,4),combo(2,8)]);
      expect(result.custom).toBe(true);expect(result.compatible).toEqual([]);
    }
  });
  it('restaura respuestas válidas sin introducir campos arbitrarios',()=>{
    expect(readCameraProfile(undefined,JSON.stringify({version:1,answers:{property:'casa',areas:4,units:80,priority:'inventado',customer_password:'secreto'}}))).toEqual({property:'casa',areas:4});
    expect(readCameraProfile(undefined,'roto')).toBeUndefined();
  });
});
describe('Contacto configurable y fotos originales',()=>{
  it('codifica el mensaje y rechaza marcadores o destinos distintos de WhatsApp',()=>{
    const url=whatsappURL('+57 300 000 0000','Cámaras & instalación\nÁreas: 4');
    expect(new URL(url!).searchParams.get('text')).toBe('Cámaras & instalación\nÁreas: 4');
    expect(whatsappURL('[COMPLETAR]','Hola')).toBeUndefined();
    expect(configuredWhatsapp({whatsapp_number:'[COMPLETAR]'},[{platform:'whatsapp',url:'https://wa.me/573000000000'}])).toBe('573000000000');
    expect(configuredWhatsapp({},[{platform:'whatsapp',url:'https://example.com/573000000000'}])).toBeUndefined();
  });
  it('cada referencia identifica fotos existentes; los códigos no se repiten',()=>{
    expect(metadata).toHaveLength(37);
    expect(new Set(metadata.map(p=>p.sku)).size).toBe(37);
    const originals=new Set(photos.map(p=>p.url));
    for(const product of metadata)for(const photo of product.gallery)expect(originals.has(photo)).toBe(true);
  });
  it('respeta precios y fotos administrativas; no revive fichas retiradas tras integrar el catálogo',()=>{
    const source=metadata[0];
    const products=commercialProducts([{id:90,name:source.name,price:123456,image_url:'/api/uploads/real.webp'}]);
    expect(products).toHaveLength(1);
    expect(products[0].price).toBe(123456);
    expect(products[0].gallery[0]).toBe('/api/uploads/real.webp');
    expect(products[0].sku).toBe(source.sku);
  });
  it('conserva el orden administrativo entre equipos con fotografías',()=>{
    const products=commercialProducts([{id:91,name:'Z cámara',image_url:'/api/uploads/z.webp'},{id:92,name:'A cámara',image_url:'/api/uploads/a.webp'}]);
    expect(products.map(p=>p.id)).toEqual([91,92]);
  });
});
