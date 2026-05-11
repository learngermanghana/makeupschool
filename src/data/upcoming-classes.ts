import { getSedifexAvailability, getSedifexIntegrationProducts, type SedifexCatalogItem } from '@/lib/server/sedifex';

export type UpcomingClass = { id: string; name: string; image: string; imageAlt: string; startDate: string; duration: string; schedule: string; slots: string; category: 'Full Programs' | 'Short Courses' };

export const upcomingClasses: UpcomingClass[] = [
  { id: 'beauty-therapy-april', name: 'Beauty Therapy', image: '/uploads/courses/WhatsApp Image 2026-03-21 at 17.57.49 (1).jpeg', imageAlt: 'Beauty therapy practical training in session', startDate: '12 April 2026', duration: '6 months', schedule: 'Weekday • Morning', slots: 'Limited slots', category: 'Full Programs' }
];

function fmtDate(value?: string) {
  if (!value) return 'TBA';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function getUpcomingClasses() {
  try {
    const [availability, catalog] = await Promise.all([getSedifexAvailability(), getSedifexIntegrationProducts()]);
    const services = new Map<string, SedifexCatalogItem>();
    for (const item of (catalog?.publicServices || []) as SedifexCatalogItem[]) services.set(item.id, item);
    const slots = availability?.slots || [];
    if (slots.length) {
      return slots.map((slot: any) => {
        const service = services.get(slot.serviceId);
        const seats = Number(slot.seatsRemaining ?? 0);
        return {
          id: slot.id,
          name: service?.name || 'Class',
          image: service?.imageUrl || '/uploads/courses/WhatsApp Image 2026-03-21 at 17.57.49 (1).jpeg',
          imageAlt: service?.imageAlt || service?.name || 'Class image',
          startDate: fmtDate(slot.startAt),
          duration: 'See class details',
          schedule: slot.timezone || 'Scheduled',
          slots: seats > 0 ? `${seats} seats left` : 'Waitlist',
          category: 'Short Courses' as const
        };
      });
    }
  } catch (error) {
    console.warn('Falling back to local upcoming classes:', error);
  }
  return upcomingClasses;
}
