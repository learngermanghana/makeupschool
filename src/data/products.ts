import { getSedifexIntegrationProducts, type SedifexCatalogItem } from '@/lib/server/sedifex';

export type Product = {
  name: string;
  image: string;
  description: string;
  price: string;
};

export const products: Product[] = [
  { name: 'Radiance Facial Kit', image: '/uploads/products/radiance-facial-kit.svg', description: 'A classroom favourite skincare set for cleansing, exfoliating, and finishing facials.', price: 'GH₵ 240' },
  { name: 'Pro Brush Collection', image: '/uploads/products/pro-brush-collection.svg', description: 'Premium multi-use brushes for flawless beauty therapy and make-up application.', price: 'GH₵ 180' }
];

function formatPrice(value?: number) {
  if (typeof value !== 'number') return 'Price on request';
  return `GH₵ ${value}`;
}

export async function getProducts() {
  try {
    const catalog = await getSedifexIntegrationProducts();
    const publicProducts = (catalog?.publicProducts || []) as SedifexCatalogItem[];
    if (publicProducts.length) {
      return publicProducts.map((item) => ({
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
