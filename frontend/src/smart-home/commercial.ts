// Advisory proposal, not approved sale prices. Independent of catalog products/prices.
export const RESEARCH_DATE = '2026-10-12';
export const commercialSources = [
  {
    name: 'Help Soluciones: mantenimiento de 1–2 servidores',
    url: 'https://www.helpsoluciones.com.co/blog/servidores-empresas-bogota-instalacion-mantenimiento',
    reference: '350.000–900.000 COP/mes; alcance empresarial con visitas.',
  },
  {
    name: 'Ramos Labs: planes y mantenimiento',
    url: 'https://ramoslabs.com/servicio/',
    reference:
      'Hogar desde 47.900 COP/mes por equipo; servidor desde 476.000 COP/mes. Los alcances difieren.',
  },
  {
    name: 'Harley Vásquez: servidores y datacenter',
    url: 'https://harleyvasqueztech.vercel.app/servicio-datacenter.html',
    reference:
      'Instalación desde 450.000 COP y monitoreo desde 320.000 COP/mes.',
  },
  {
    name: 'Sigma Tiendas: Beelink S12 N100',
    url: 'https://sigmatiendas.com/es-co/products/mini-pc-beelink-s12-16-gb-ram-500-gb-ssd-con-intel-n100',
    reference: 'Referencia consultada: 1.504.000 COP; 16 GB RAM y SSD 500 GB.',
  },
  {
    name: 'PS Shop: servidores',
    url: 'https://www.ps-shop.com.co/Categoria-Producto/servidores-y-almacenamiento/servidores-de-rack/',
    reference:
      'PowerEdge T150 anunciado por 10.113.599 COP. Configuración, IVA y vigencia se reconfirman.',
  },
  {
    name: 'Tauret: GPU RTX 5060 Ti 16 GB',
    url: 'https://tauretcomputadores.com/product/tarjeta-de-video-msi-geforce-rtx-5060-ti-ventus-2x-oc-plus-gddr7-16gb',
    reference:
      'GPU como componente para estudiar IA local; no incluye computador, memoria, UPS ni rack.',
  },
];
export type ServiceCostInput = {
  infrastructure: 'local' | 'cloud' | 'shared';
  units: number;
  servers: number;
  points: number;
  integrated: boolean;
};
export function serviceCostProposal(input: ServiceCostInput) {
  const units = Math.max(1, Math.min(5000, Math.floor(input.units))),
    servers = Math.max(1, Math.min(50, Math.floor(input.servers)));
  const points = Math.max(0, Math.min(10000, Math.floor(input.points)));
  const serverSetup =
    input.infrastructure === 'cloud' ? 350000 : servers * 450000;
  const tenantSetup =
    input.infrastructure === 'shared' ? units * 90000 + 900000 : 0;
  const deviceInstallation = points * (input.integrated ? 110000 : 75000);
  const monthly =
    input.infrastructure === 'shared'
      ? servers * 350000 + units * 49000
      : input.infrastructure === 'cloud'
        ? 129000
        : servers * 89000;
  return {
    serverSetup,
    tenantSetup,
    deviceInstallation,
    setupTotal: serverSetup + tenantSetup + deviceInstallation,
    monthly,
    annual: monthly * 12,
    proposal: true,
  };
}
export const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
