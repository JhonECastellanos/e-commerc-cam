import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PaginatedCatalog from '../src/components/public/PaginatedCatalog';
import { featuredCombos } from '../src/utils/featuredCombos';

describe('complete catalogue navigation',()=>{
  it('paginates the entire filtered result, resets on filters and clamps a smaller result',()=>{
    const items=Array.from({length:19},(_,i)=>i+1),renderItem=(id:number)=><article key={id}>Equipo {id}</article>;
    const view=render(<PaginatedCatalog items={items} render={renderItem} label="equipos" filterKey="all" className="grid"/>);
    fireEvent.click(screen.getByRole('button',{name:'Página siguiente de equipos'}));
    expect(screen.getByText('Equipo 9')).toBeVisible();expect(screen.queryByText('Equipo 1')).not.toBeInTheDocument();
    view.rerender(<PaginatedCatalog items={items.filter(n=>n%2===0)} render={renderItem} label="equipos" filterKey="even" className="grid"/>);
    expect(screen.getByText('Equipo 2')).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'Página siguiente de equipos'}));expect(screen.getByText('Equipo 18')).toBeVisible();
    view.rerender(<PaginatedCatalog items={[2]} render={renderItem} label="equipos" filterKey="even" className="grid"/>);
    expect(screen.getByText('Equipo 2')).toBeVisible();expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
  it('preserves the three original highlighted offers before three named Dahua offers',()=>{
    const base={brand_name:'Hikvision / HiLook',mode:'cableado',resolution:'2MP',cameras_count:4,final_price:100};
    const combos=[{...base,id:1},...Array.from({length:3},(_,i)=>({...base,id:481+i,level:'destacado'})),...Array.from({length:5},(_,i)=>({...base,id:484+i,name:'4cam_2mp_dvr_8chanels_1tb_app',brand_name:'Dahua / Cooper'}))];
    expect(featuredCombos(combos).map(c=>c.id)).toEqual([481,482,483,484,485,486]);
  });
});
