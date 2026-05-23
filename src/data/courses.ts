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
    priceMinor?: unknown;
    sellingPrice?: unknown;
    salePrice?: unknown;
    amount?: unknown;
    fee?: unknown;
    registrationFee?: unknown;
  };
  const major = Number(record.registrationFee ?? record.price ?? record.sellingPrice ?? record.salePrice ?? record.amount ?? record.fee);
  if (Number.isFinite(major) && major > 0) return major;
  const minor = Number(record.priceMinor);
  return Number.isFinite(minor) && minor > 0 ? minor / 100 : undefined;
}

function extractCatalogItems(catalog: unknown): SedifexCatalogItem[] {
  const data = catalog as {
    products?: unknown;
    publicProducts?: unknown;
    publicServices?: unknown;
    services?: unknown;
    items?: unknown;
  } | null;

  return [data?.products, data?.publicServices, data?.services, data?.publicProducts, data?.items]
    .flatMap((value) => Array.isArray(value) ? value as SedifexCatalogItem[] : []);
}

function isCourseLike(item: SedifexCatalogItem) {
  const record = item as SedifexCatalogItem & { listingType?: unknown; serviceKind?: unknown; enrollmentMode?: unknown; type?: unknown };
  const itemType = `${item.itemType || ''}`.toLowerCase();
  const type = `${record.type || ''}`.toLowerCase();
  const listingType = `${record.listingType || ''}`.toLowerCase();
  const serviceKind = `${record.serviceKind || ''}`.toLowerCase();
  const enrollmentMode = `${record.enrollmentMode || ''}`.toLowerCase();
  const category = `${item.category || ''}`.toLowerCase();

  return (
    itemType === 'service' ||
    itemType === 'course' ||
    type === 'service' ||
    type === 'course' ||
    listingType === 'course' ||
    listingType === 'service' ||
    serviceKind.includes('course') ||
    serviceKind.includes('training') ||
    enrollmentMode.includes('open') ||
    enrollmentMode.includes('scheduled') ||
    category.includes('course') ||
    category.includes('training') ||
    category.includes('education')
  );
}

export async function getCourses() {
  try {
    const catalog = await getSedifexIntegrationProducts();
    const normalizedServices = extractCatalogItems(catalog).filter(isCourseLike);
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
