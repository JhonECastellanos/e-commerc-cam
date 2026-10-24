import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../src/i18n';
import ComboCard from '../src/components/public/ComboCard';
import { vi } from 'vitest';
vi.mock('../src/hooks/useCommercialContact',()=>({useCommercialContact:()=>undefined}));

const combo = {
  id: 7,
  brand_name: 'Hikvision',
  mode: 'cableado',
  resolution: '2MP',
  cameras_count: 4,
  final_price: 1300000,
  is_bestseller: true,
  is_budget: false,
  warranty_text: '1 año',
  image_url: null,
  install_complexity: 'media',
};

function renderCard(data = combo) {
  return render(
    <MemoryRouter>
      <ComboCard combo={data} />
    </MemoryRouter>
  );
}

describe('ComboCard', () => {
  it('muestra marca, cámaras, resolución y precio formateado en COP', () => {
    renderCard();
    expect(screen.getByText('Hikvision')).toBeInTheDocument();
    expect(screen.getByText('4 cámaras · 2MP')).toBeInTheDocument();
    expect(screen.getByText(/\$\s*1\.300\.000 COP/)).toBeInTheDocument();
  });

  it('enlaza al detalle y al checkout del combo', () => {
    renderCard();
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/catalogo/7');
    expect(hrefs).toContain('/checkout/7');
  });

  it('muestra la insignia de más vendido solo cuando aplica', () => {
    renderCard();
    expect(screen.getByText('Destacado')).toBeInTheDocument();
    renderCard({ ...combo, id: 8, is_bestseller: false });
    expect(screen.getAllByText('Destacado')).toHaveLength(1);
  });

  it('distingue el precio total y el alcance de instalación', () => {
    renderCard();
    expect(screen.getByText(/Precio total · Instalación incluida/)).toBeInTheDocument();
  });
});
