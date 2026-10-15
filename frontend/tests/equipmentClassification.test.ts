import { describe, expect, it } from 'vitest';
import metadata from '../src/data/catalog-products.json';
import { commercialProducts } from '../src/utils/productCatalog';
import { classifiedSpecs, equipmentClassification } from '../src/utils/equipmentClassification';
const products=commercialProducts(metadata.map((p,i)=>({id:i+100,name:p.name,category:p.category,description:p.sku,price:null})));
const find=(model:string)=>products.find(p=>p.model?.startsWith(model))!;
describe('Evidence-based installation and capability tree',()=>{
  it('classifies all original-folder products without changing their identity or prices',()=>{
    expect(products).toHaveLength(37);
    expect(products.every(p=>equipmentClassification(p).modes.includes('cableado'))).toBe(true);
    expect(products.every(p=>p.price===null&&p.gallery.length>0)).toBe(true);
  });
  it('keeps IP, hybrid illumination, PoC and Wi-Fi distinct',()=>{
    const hybridLight=find('DS-2CE10KF0T-LFS');
    expect(equipmentClassification(hybridLight).modes).not.toContain('inalambrico');
    expect(equipmentClassification(find('DS-2CE10UF3T-E')).functions).not.toContain('poe');
    const ip=equipmentClassification(find('IPC-B140HAA'));
    expect(ip.modes).toEqual(['cableado','hibrido','solar']);
    expect(ip.functions).toContain('poe');
    expect(ip.functions).not.toContain('solar-power');
  });
  it('distinguishes PTZ motion from event detection and motorized focal length',()=>{
    expect(equipmentClassification(find('DS-2AE5225ITG')).functions).toContain('ptz');
    expect(equipmentClassification(find('DS-2AE5225ITG')).functions).not.toContain('motion');
    expect(equipmentClassification(find('IPC-B620HAA')).functions).not.toContain('ptz');
    expect(equipmentClassification(find('IPC-B620HAA')).functions).toContain('motion');
  });
  it('limits bidirectional audio and deterrent lights to evidenced optional SX variants',()=>{
    const plain=find('IPC-B140HAA');
    expect(equipmentClassification(plain).functions).not.toContain('two-way');
    const sx=equipmentClassification(find('IPC-T240HAA'));
    expect(sx.functions).toContain('two-way');expect(sx.note).toMatch(/solo en la variante SX/);
    expect(sx.functions).not.toContain('alarm');
    expect(classifiedSpecs(plain)['Disuasion Activa']).toMatch(/verificar variante/);
    expect(classifiedSpecs(plain)['Ficha Tecnica']).not.toMatch(/sirena|bidireccional/i);
  });
  it('includes recorders as recording infrastructure without inventing an AI server product',()=>{
    expect(equipmentClassification(find('HWD-7104MH-G4')).functions).toContain('recorder');
    expect(products.some(p=>p.category==='Servidor de IA')).toBe(false);
  });
});

it('uses only valid administrator classifications and hides internal classification keys from specs',()=>{
 const product={id:1,name:'Grabador verificado',gallery:[],specs:{'Clasificacion manual':'si','Modalidades del catalogo':'cableado,hibrido,unknown','Funciones del catalogo':'recorder,motion,unknown'}};
 expect(equipmentClassification(product).modes).toEqual(['cableado','hibrido']);
 expect(equipmentClassification(product).functions).toEqual(['recorder','motion']);
});
