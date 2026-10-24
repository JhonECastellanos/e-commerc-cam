import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import CatalogAdmin from '../src/components/admin/CatalogAdmin';
import { api } from '../src/api/client';

afterEach(()=>vi.restoreAllMocks());

it('retries a failed follow-up update without creating the product twice',async()=>{
  vi.spyOn(api,'adminGetProductsAdmin').mockResolvedValue([]);
  vi.spyOn(api,'adminGetBrands').mockResolvedValue([{id:1,name:'HiLook'}]);
  const create=vi.spyOn(api,'adminCreateProduct').mockResolvedValue({id:23});
  const update=vi.spyOn(api,'adminUpdateProductAdmin').mockRejectedValueOnce(new Error('Conexión interrumpida')).mockResolvedValue({id:23});
  const user=userEvent.setup();render(<CatalogAdmin kind="productos"/>);
  await waitFor(()=>expect(screen.queryByText('Cargando catálogo…')).not.toBeInTheDocument());
  await user.click(screen.getByRole('button',{name:'Nuevo producto'}));
  await user.type(screen.getByRole('textbox',{name:'Nombre',exact:true}),'Equipo nuevo');
  await user.selectOptions(screen.getByRole('combobox',{name:'Marca',exact:true}),'1');
  await user.click(screen.getByRole('button',{name:'Crear registro'}));
  await expect(screen.findByRole('alert')).resolves.toHaveTextContent('Conexión interrumpida');
  await user.click(screen.getByRole('button',{name:'Guardar cambios'}));
  await expect(screen.findByRole('status')).resolves.toHaveTextContent('Cambios guardados');
  expect(create).toHaveBeenCalledTimes(1);expect(update).toHaveBeenCalledTimes(2);
  expect(update).toHaveBeenLastCalledWith(23,expect.objectContaining({name:'Equipo nuevo',price:null}));
});
