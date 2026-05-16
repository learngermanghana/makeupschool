import {
  getSedifexAvailability,
  getSedifexIntegrationProducts,
  type SedifexAvailabilitySlot,
  type SedifexCatalogItem
} from '@/lib/server/sedifex';

export type UpcomingClass = {
  id: string;
  name: string;
  image: string;
  imageAlt: string;
  startDate: string;
  duration: string;
  schedule: string;
  slots: string;
  category: 'Full Programs' | 'Short Courses';
};

export const upcomingClasses: UpcomingClass[] = [
  {
    id: 'beauty-therapy-april',
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

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function fmtTime(value?: string) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function fmtSchedule(slot: SedifexAvailabilitySlot) {
  const start = fmtTime(slot.startAt);
  const end = fmtTime(slot.endAt);
  const timezone = slot.timezone || 'Africa/Accra';

  if (start && end) return `${start} - ${end} • ${timezone}`;
  if (start) return `${start} • ${timezone}`;

  return timezone;
}

function fmtDuration(slot: SedifexAvailabilitySlot, service?: SedifexCatalogItem) {
  if (service?.duration) return service.duration;

  const attributeDuration = typeof slot.attributes?.duration === 'string' ? slot.attributes.duration : '';
  if (attributeDuration) return attributeDuration;

  if (!slot.startAt || !slot.endAt) return 'See class details';

  const start = new Date(slot.startAt).getTime();
  const end = new Date(slot.endAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 'See class details';
  }

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

  if (Number.isFinite(capacity) && capacity > 0) {
    return `${capacity} seats available`;
  }

  return 'Limited slots';
}

function getCategory(service?: SedifexCatalogItem): UpcomingClass['category'] {
  const value = `${service?.category || service?.itemType || ''}`.toLowerCase();

  if (value.includes('full') || value.includes('program')) return 'Full Programs';

  return 'Short Courses';
}

function extractSlots(payload: unknown): SedifexAvailabilitySlot[] {
  const data = payload as { slots?: unknown; availability?: unknown; data?: { slots?: unknown; availability?: unknown } };

  const slots = data?.slots || data?.availability || data?.data?.slots || data?.data?.availability || [];

  return Array.isArray(slots) ? (slots as SedifexAvailabilitySlot[]) : [];
}

export function extractServices(payload: unknown): SedifexCatalogItem[] {
  const data = payload as { publicServices?: unknown; services?: unknown; products?: unknown };
  const publicServices = Array.isArray(data?.publicServices) ? data.publicServices as SedifexCatalogItem[] : [];
  const services = Array.isArray(data?.services) ? data.services as SedifexCatalogItem[] : [];
  const products = Array.isArray(data?.products) ? data.products as SedifexCatalogItem[] : [];

  return [
    ...publicServices,
    ...services,
    ...products.filter((item) => item.itemType?.toLowerCase() === 'service')
  ];
}

function serviceKeyCandidates(service: SedifexCatalogItem) {
  const extra = service as SedifexCatalogItem & { sourceProductId?: string; sourceId?: string };
  return [service.id, extra.sourceProductId, extra.sourceId, service.name]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .map((value) => value.trim());
}

export function buildServiceMap(catalog: unknown) {
  const services = new Map<string, SedifexCatalogItem>();
  for (const item of extractServices(catalog)) {
    for (const key of serviceKeyCandidates(item)) services.set(key, item);
  }
  return services;
}

export async function getUpcomingClasses() {
  try {
    const fromDate = new Date();
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 240);

    const [availability, catalog] = await Promise.all([
      getSedifexAvailability({
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      }),
      getSedifexIntegrationProducts()
    ]);

    const services = buildServiceMap(catalog);

    const slots = extractSlots(availability)
      .filter((slot) => !slot.status || slot.status.toLowerCase() === 'open')
      .sort((a, b) => {
        const first = new Date(a.startAt || 0).getTime();
        const second = new Date(b.startAt || 0).getTime();
        return first - second;
      });

    if (slots.length) {
      return slots.map((slot) => {
        const service = slot.serviceId ? services.get(slot.serviceId) : undefined;
        const level = typeof slot.attributes?.level === 'string' ? slot.attributes.level : '';
        const slotServiceName = typeof (slot as SedifexAvailabilitySlot & { serviceName?: string }).serviceName === 'string'
          ? (slot as SedifexAvailabilitySlot & { serviceName?: string }).serviceName
          : '';
        const name = service?.name || slotServiceName || level || 'Upcoming Class';

        return {
          id: slot.id,
          name,
          image: service?.imageUrl || '/uploads/courses/WhatsApp Image 2026-03-21 at 17.57.49 (1).jpeg',
          imageAlt: service?.imageAlt || service?.name || `${name} class image`,
          startDate: fmtDate(slot.startAt),
          duration: fmtDuration(slot, service),
          schedule: level ? `${fmtSchedule(slot)} • ${level}` : fmtSchedule(slot),
          slots: fmtSlots(slot),
          category: getCategory(service)
        };
      });
    }
  } catch (error) {
    console.warn('Falling back to local upcoming classes:', error);
  }

  return upcomingClasses;
}