import { getSedifexIntegrationProducts, type SedifexCatalogItem } from '@/lib/server/sedifex';

export type Course = {
  slug: string;
  name: string;
  duration: string;
  summary: string;
  category: 'Full Program' | 'Short Course';
  image: string;
  imageAlt: string;
  modules?: string[];
};

export const courses: Course[] = [
  { slug: 'beauty-therapy', name: 'Beauty Therapy', duration: '6 months', summary: 'Master spa-ready beauty services, advanced skin care, and polished make-up artistry.', category: 'Full Program', image: '/uploads/courses/WhatsApp Image 2026-03-21 at 17.57.49.jpeg', imageAlt: 'Beauty therapy practical session' },
  { slug: 'hairdressing', name: 'Hairdressing', duration: '9 months', summary: 'Build salon confidence in styling, braiding, extensions, treatments, and foundational theory.', category: 'Full Program', image: '/uploads/homepage/hairdressing.jpeg', imageAlt: 'Hairdressing braids practice' }
];

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function getCourses() {
  try {
    const catalog = await getSedifexIntegrationProducts();
    const catalogItems = (catalog?.products || []) as SedifexCatalogItem[];
    const services = catalogItems.filter((item) => item.itemType?.toLowerCase() === 'service');
    const normalizedServices = services.length ? services : ((catalog?.publicServices || []) as SedifexCatalogItem[]);
    if (normalizedServices.length) {
      return normalizedServices.map((service) => ({
        slug: toSlug(service.name),
        name: service.name,
        duration: 'See schedule',
        summary: service.description || 'Professional training program',
        category: 'Short Course' as const,
        image: service.imageUrl || '/uploads/courses/WhatsApp Image 2026-03-21 at 17.57.49.jpeg',
        imageAlt: service.imageAlt || service.name
      }));
    }
  } catch (error) {
    console.warn('Falling back to local courses:', error);
  }

  return courses;
}
