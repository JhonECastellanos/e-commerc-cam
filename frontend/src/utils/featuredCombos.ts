import type { Combo } from './commercial';
export function featuredCombos(combos: Combo[]): Combo[] {
  const existing = combos.filter(c => c.level).slice(0,3);
  const primary = existing.length ? existing : combos.filter(c => c.is_bestseller || c.is_budget).slice(0,3);
  const dahua = combos.filter(c => /dahua|cooper/i.test(c.brand_name) && c.name && c.mode === 'cableado').sort((a,b) => a.id-b.id).slice(0,3);
  return [...(primary.length ? primary : combos.slice(0,3)), ...dahua.filter(c=>!primary.some(p=>p.id===c.id))];
}
