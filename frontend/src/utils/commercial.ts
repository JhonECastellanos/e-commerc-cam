export type Combo = {
  id: number;
  name?: string;
  brand_name: string;
  brand_id?: number;
  mode: string;
  cameras_count: number;
  resolution: string;
  final_price: number | string;
  image_url?: string | null;
  active?: boolean;
  level?: string;
  is_bestseller?: boolean;
  is_budget?: boolean;
  instalacion_incluida?: boolean;
  included_items?: string[];
};
export type Product = {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  brand_name?: string | null;
  brand_id?: number | null;
  price?: number | null;
  instalacion_price?: number | null;
  image_url?: string | null;
  specs?: Record<string, any>;
  active?: boolean;
};
export const modeLabels: Record<string, string> = { cableado: 'Cableado', inalambrico: 'Inalámbrico', hibrido: 'Híbrido', solar: 'Solar', poe: 'PoE' };
export function money(value: number | string | null | undefined): string {
  return value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) > 0 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value)) + ' COP' : 'A cotizar';
}
export function installationLabel(combo: Combo) {
  return combo.instalacion_incluida === false ? 'Instalación a cotizar' : 'Instalación incluida · alcance sujeto a cobertura';
}
