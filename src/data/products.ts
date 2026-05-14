import { getSedifexIntegrationProducts, type SedifexCatalogItem } from '@/lib/server/sedifex';

export type Product = {
  slug: string;
  id?: string;
  name: string;
  image: string;
  description: string;
  price: string;
};

export const products: Product[] = [
  { slug: 'radiance-facial-kit', name: 'Radiance Facial Kit', image: '/uploads/products/radiance-facial-kit.svg', description: 'A classroom favourite skincare set for cleansing, exfoliating, and finishing facials.', price: 'GH₵ 240' },
  { slug: 'pro-brush-collection', name: 'Pro Brush Collection', image: '/uploads/products/pro-brush-collection.svg', description: 'Premium multi-use brushes for flawless beauty therapy and make-up application.', price: 'GH₵ 180' }
];

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function makeStableSlug(item: SedifexCatalogItem) {
  const baseSlug = toSlug(item.name);
  if (!item.id) return baseSlug;
  return `${baseSlug}-${item.id.slice(-6).toLowerCase()}`;
}

function formatPrice(value?: number) {
  if (typeof value !== 'number') return 'Price on request';
  return `GH₵ ${value}`;
}

export async function getProducts() {
  try {
    const catalog = await getSedifexIntegrationProducts();
    const catalogItems = (catalog?.products || []) as SedifexCatalogItem[];
    const productItems = catalogItems.filter((item) => item.itemType?.toLowerCase() === 'product');
    const normalizedProducts = productItems.length ? productItems : ((catalog?.publicProducts || []) as SedifexCatalogItem[]);
    if (normalizedProducts.length) {
      return normalizedProducts.map((item) => ({
        slug: makeStableSlug(item),
        id: item.id,
        name: item.name,
        image: item.imageUrl || '/uploads/products/radiance-facial-kit.svg',
        description: item.description || 'Professional beauty product',
        price: formatPrice(item.price)
      }));
    }
  } catch (error) {
    console.warn('Falling back to local products:', error);
  }

  return products;
}

export async function getProductBySlug(slug: string) {
  const allProducts = await getProducts();
  return allProducts.find((product) => product.slug === slug) || null;
}
