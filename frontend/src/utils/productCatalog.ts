import metadata from '../data/catalog-products.json';
import { productPhoto } from './catalogPhotos';
import type { Product } from './commercial';
export type CatalogProduct = Omit<Product, 'id'> & {
  id: number | string;
  sku?: string;
  model?: string;
  gallery: string[];
  reference?: boolean;
};
export function commercialProducts(products: Product[]): CatalogProduct[] {
  const result: CatalogProduct[] = products.map(product => {
    const source = metadata.find(p => p.name === product.name || Boolean(product.description?.includes(p.sku)));
    const actual = productPhoto({ ...product, description: product.description || undefined });
    return { ...product, sku: source?.sku, model: source?.model, brand_name: product.brand_name || source?.brand, category: product.category || source?.category, specs: Object.fromEntries(Object.entries({ ...source?.specs, ...product.specs }).filter((entry): entry is [
        string,
        string
      ] => typeof entry[1] === 'string')), gallery: Array.isArray(product.specs?.catalog_images) ? product.specs.catalog_images : [...new Set([actual, ...(source?.gallery || [])].filter((url): url is string => Boolean(url)))] };
  });
  // Prioritize actual photographs while retaining the API's administrative order.
  return result.sort((a, b) => Number(Boolean(b.gallery.length)) - Number(Boolean(a.gallery.length)));
}
