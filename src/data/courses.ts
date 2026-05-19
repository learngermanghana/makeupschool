import { getSedifexIntegrationProducts, type SedifexCatalogItem } from '@/lib/server/sedifex';
import { cleanCatalogDescription } from '@/lib/content-format';

export type Course = {
  slug: string;
  name: string;
  duration: string;
  summary: string;
  category: 'Full Program' | 'Short Course';
  image: string;
  imageAlt: string;
  modules?: string[];
  serviceId?: string;
  price?: number;
  currency?: string;
};

export const courses: Course[] = [
  { slug: 'beauty-therapy', name: 'Beauty Therapy', duration: '6 months', summary: 'Master spa-ready beauty services, advanced skin care, and polished make-up artistry.', category: 'Full Program', image: '/uploads/courses/WhatsApp Image 2026-03-21 at 17.57.49.jpeg', imageAlt: 'Beauty therapy practical session' },
  { slug: 'hairdressing', name: 'Hairdressing', duration: '9 months', summary: 'Build salon confidence in styling, braiding, extensions, treatments, and foundational theory.', category: 'Full Program', image: '/uploads/homepage/hairdressing.jpeg', imageAlt: 'Hairdressing braids practice' }
];

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function readCurrency(service: SedifexCatalogItem) {
  const record = service as SedifexCatalogItem & { currency?: unknown };
  return typeof record.currency === 'string' && record.currency.trim() ? record.currency.trim().toUpperCase() : 'GHS';
}

function readPrice(service: SedifexCatalogItem) {
  const record = service as SedifexCatalogItem & {
    price?: unknown;
    sellingPrice?: unknown;
    salePrice?: unknown;
    amount?: unknown;
    fee?: unknown;
    registrationFee?: unknown;
  };
  const value = Number(record.registrationFee ?? record.price ?? record.sellingPrice ?? record.salePrice ?? record.amount ?? record.fee);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export async function getCourses() {
  try {
    const catalog = await getSedifexIntegrationProducts();
    const catalogItems = (catalog?.products || []) as SedifexCatalogItem[];
    const services = catalogItems.filter((item) => {
      const record = item as SedifexCatalogItem & { listingType?: unknown; serviceKind?: unknown; enrollmentMode?: unknown };
      const itemType = `${item.itemType || ''}`.toLowerCase();
      const listingType = `${record.listingType || ''}`.toLowerCase();
      const serviceKind = `${record.serviceKind || ''}`.toLowerCase();
      const enrollmentMode = `${record.enrollmentMode || ''}`.toLowerCase();

      return (
        itemType === 'service' ||
        itemType === 'course' ||
        listingType === 'course' ||
        serviceKind.includes('course') ||
        enrollmentMode.includes('open') ||
        enrollmentMode.includes('scheduled')
      );
    });
    const normalizedServices = services.length ? services : ((catalog?.publicServices || []) as SedifexCatalogItem[]);
    if (normalizedServices.length) {
      return normalizedServices.map((service) => ({
        slug: toSlug(service.name),
        serviceId: service.id,
        name: service.name,
        duration: service.duration || 'See schedule',
        summary: cleanCatalogDescription(service.description) || 'Professional training program',
        category: 'Short Course' as const,
        image: service.imageUrl || '/uploads/courses/WhatsApp Image 2026-03-21 at 17.57.49.jpeg',
        imageAlt: service.imageAlt || service.name,
        price: readPrice(service),
        currency: readCurrency(service)
      }));
    }
  } catch (error) {
    console.warn('Falling back to local courses:', error);
  }

  return courses;
}

export async function getCourseBySlug(slug: string) {
  const allCourses = await getCourses();
  return allCourses.find((course) => course.slug === slug) || null;
}