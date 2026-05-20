import {
  getSedifexAvailability,
  getSedifexIntegrationProducts,
  type SedifexAvailabilitySlot,
  type SedifexCatalogItem
} from '@/lib/server/sedifex';

export type UpcomingClass = {
  id: string;
  slug: string;
  name: string;
  image: string;
  imageAlt: string;
  startDate: string;
  duration: string;
  schedule: string;
  slots: string;
  category: 'Full Programs' | 'Short Courses';
  serviceId?: string;
  slotId?: string;
  startAt?: string;
  endAt?: string;
  price?: number;
  currency?: string;
  location?: string;
  registrationMode?: string;
};

type SlotExtras = SedifexAvailabilitySlot & { category?: string; currency?: string };

export function slugifyClass(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'class';
}

function buildClassSlug(name: string, id: string) {
  const shortId = id.replace(/[^a-z0-9]/gi, '').slice(-6).toLowerCase();
  return `${slugifyClass(name)}${shortId ? `-${shortId}` : ''}`;
}

export const upcomingClasses: UpcomingClass[] = [
  {
    id: 'beauty-therapy-april',
    slug: 'beauty-therapy-april',
    name: 'Beauty Therapy',
    image: '/uploads/courses/WhatsApp Image 2026-03-21 at 17.57.49 (1).jpeg',
    imageAlt: 'Beauty therapy practical training in session',
    startDate: '12 April 2026',
    duration: '6 months',
    schedule: 'Weekday • Morning',
    slots: 'Limited slots',
    category: 'Full Programs'
  }
];

function fmtDate(value?: string) {
  if (!value) return 'TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBA';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtSchedule(slot: SedifexAvailabilitySlot) {
  const start = fmtTime(slot.startAt);
  const end = fmtTime(slot.endAt);
  const timezone = slot.timezone || 'Africa/Accra';
  const location = slot.location || (typeof slot.attributes?.location === 'string' ? slot.attributes.location : '');
  const time = start && end ? `${start} - ${end}` : start ? start : timezone;
  return location ? `${time} • ${location}` : `${time} • ${timezone}`;
}

function fmtDuration(slot: SedifexAvailabilitySlot, service?: SedifexCatalogItem) {
  if (service?.duration) return service.duration;
  const attributeDuration = typeof slot.attributes?.duration === 'string' ? slot.attributes.duration : '';
  if (attributeDuration) return attributeDuration;
  if (!slot.startAt || !slot.endAt) return 'See class details';
  const start = new Date(slot.startAt).getTime();
  const end = new Date(slot.endAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 'See class details';
  const minutes = Math.round((end - start) / 60000);
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} hour${hours === 1 ? '' : 's'}` : `${hours.toFixed(1)} hours`;
}

function fmtSlots(slot: SedifexAvailabilitySlot) {
  const remaining = Number(slot.seatsRemaining);
  const capacity = Number(slot.capacity);
  if (Number.isFinite(remaining)) {
    if (remaining <= 0) return 'Waitlist';
    return `${remaining} seat${remaining === 1 ? '' : 's'} left`;
  }
  if (Number.isFinite(capacity) && capacity > 0) return `${capacity} seats available`;
  return 'Limited slots';
}

function getCategory(service?: SedifexCatalogItem, slot?: SedifexAvailabilitySlot): UpcomingClass['category'] {
  const slotExtras = slot as SlotExtras | undefined;
  const value = `${slotExtras?.category || slot?.attributes?.category || service?.category || service?.itemType || slot?.eventKind || ''}`.toLowerCase();
  if (value.includes('full') || value.includes('program')) return 'Full Programs';
  return 'Short Courses';
}

function extractSlots(payload: unknown): SedifexAvailabilitySlot[] {
  const data = payload as {
    slots?: unknown;
    availability?: unknown;
    items?: unknown;
    data?: { slots?: unknown; availability?: unknown; items?: unknown };
  };
  const slots = data?.slots || data?.availability || data?.items || data?.data?.slots || data?.data?.availability || data?.data?.items || [];
  return Array.isArray(slots) ? (slots as SedifexAvailabilitySlot[]) : [];
}

export function extractServices(payload: unknown): SedifexCatalogItem[] {
  const data = payload as { publicServices?: unknown; services?: unknown; products?: unknown; publicProducts?: unknown };
  const publicServices = Array.isArray(data?.publicServices) ? data.publicServices as SedifexCatalogItem[] : [];
  const services = Array.isArray(data?.services) ? data.services as SedifexCatalogItem[] : [];
  const products = Array.isArray(data?.products) ? data.products as SedifexCatalogItem[] : [];
  const publicProducts = Array.isArray(data?.publicProducts) ? data.publicProducts as SedifexCatalogItem[] : [];
  return [...publicServices, ...services, ...products, ...publicProducts];
}

function serviceKeyCandidates(service: SedifexCatalogItem) {
  const extra = service as SedifexCatalogItem & { sourceProductId?: string; sourceId?: string };
  return [service.id, extra.sourceProductId, extra.sourceId, service.name]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .map((value) => value.trim());
}

export function buildServiceMap(catalog: unknown) {
  const services = new Map<string, SedifexCatalogItem>();
  for (const item of extractServices(catalog)) for (const key of serviceKeyCandidates(item)) services.set(key, item);
  return services;
}

function slotServiceName(slot: SedifexAvailabilitySlot) {
  return typeof slot.serviceName === 'string' && slot.serviceName.trim() ? slot.serviceName.trim() : '';
}

function readPrice(slot: SedifexAvailabilitySlot, service?: SedifexCatalogItem) {
  const slotPrice = Number(slot.price ?? slot.attributes?.price ?? slot.attributes?.paymentAmount);
  if (Number.isFinite(slotPrice) && slotPrice > 0) return slotPrice;
  const servicePrice = Number(service?.price);
  return Number.isFinite(servicePrice) && servicePrice > 0 ? servicePrice : undefined;
}

function startOfTodayIso() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

export async function getUpcomingClasses() {
  try {
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 240);
    const [availability, catalog] = await Promise.all([
      getSedifexAvailability({ from: startOfTodayIso(), to: toDate.toISOString() }),
      getSedifexIntegrationProducts()
    ]);
    const services = buildServiceMap(catalog);
    const slots = extractSlots(availability)
      .filter((slot) => !slot.status || slot.status.toLowerCase() === 'open')
      .sort((a, b) => new Date(a.startAt || 0).getTime() - new Date(b.startAt || 0).getTime());

    if (slots.length) {
      return slots.map((slot) => {
        const service = slot.serviceId ? services.get(slot.serviceId) : undefined;
        const level = typeof slot.attributes?.level === 'string' ? slot.attributes.level : '';
        const name = service?.name || slotServiceName(slot) || level || 'Upcoming Class';
        const price = readPrice(slot, service);
        const slotExtras = slot as SlotExtras;
        return {
          id: slot.id,
          slug: buildClassSlug(name, slot.id),
          slotId: slot.id,
          serviceId: slot.serviceId || service?.id || '',
          name,
          image: slot.imageUrl || (typeof slot.attributes?.imageUrl === 'string' ? slot.attributes.imageUrl : '') || service?.imageUrl || '/uploads/courses/WhatsApp Image 2026-03-21 at 17.57.49 (1).jpeg',
          imageAlt: slot.imageAlt || (typeof slot.attributes?.imageAlt === 'string' ? slot.attributes.imageAlt : '') || service?.imageAlt || service?.name || `${name} class image`,
          startDate: fmtDate(slot.startAt),
          startAt: slot.startAt,
          endAt: slot.endAt,
          duration: fmtDuration(slot, service),
          schedule: level ? `${fmtSchedule(slot)} • ${level}` : fmtSchedule(slot),
          slots: fmtSlots(slot),
          category: getCategory(service, slot),
          price,
          currency: (typeof slotExtras.currency === 'string' && slotExtras.currency) || (typeof service?.attributes?.currency === 'string' ? service.attributes.currency : 'GHS'),
          location: slot.location || (typeof slot.attributes?.location === 'string' ? slot.attributes.location : ''),
          registrationMode: slot.registrationMode || (typeof slot.attributes?.registrationMode === 'string' ? slot.attributes.registrationMode : '')
        } satisfies UpcomingClass;
      });
    }
  } catch (error) {
    console.warn('Falling back to local upcoming classes:', error);
  }
  return upcomingClasses;
}

export async function getUpcomingClassBySlug(slug: string) {
  const classes = await getUpcomingClasses();
  return classes.find((item) => item.slug === slug || item.id === slug || item.slotId === slug) || null;
}