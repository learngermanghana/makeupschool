import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/button-link';
import { getUpcomingClassBySlug, getUpcomingClasses } from '@/data/upcoming-classes';
import { reserveClassWhatsAppLink } from '@/lib/whatsapp';

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

type UpcomingClassItem = NonNullable<Awaited<ReturnType<typeof getUpcomingClassBySlug>>>;

function registerHref(item: UpcomingClassItem) {
  const params = new URLSearchParams();
  if (item.serviceId) params.set('courseId', item.serviceId);
  params.set('course', item.name);
  if (item.slotId) params.set('classSlotId', item.slotId);
  return `/register?${params.toString()}`;
}

export async function generateStaticParams() {
  const classes = await getUpcomingClasses();
  return classes.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const item = await getUpcomingClassBySlug(resolvedParams.slug);
  if (!item) return { title: 'Upcoming Class' };
  return {
    title: `${item.name} Upcoming Class`,
    description: `Register for the upcoming ${item.name} class at Make Up & More School of Cosmetology. ${item.startDate} • ${item.schedule}`
  };
}

export default async function UpcomingClassDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const item = await getUpcomingClassBySlug(resolvedParams.slug);
  if (!item) notFound();

  return (
    <main className="section-shell py-16 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-card">
          <div className="relative aspect-[4/3] bg-gradient-to-br from-blush via-white to-nude">
            <Image
              src={item.image}
              alt={item.imageAlt}
              fill
              priority
              unoptimized={item.image.startsWith('http')}
              className="object-cover"
              sizes="(min-width: 1024px) 55vw, 100vw"
            />
          </div>
        </div>

        <section className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-card sm:p-10">
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full bg-blush px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-charcoal">{item.category}</span>
            <span className="rounded-full bg-charcoal px-4 py-2 text-xs font-medium text-white">{item.slots}</span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-charcoal sm:text-5xl">{item.name}</h1>
          <p className="mt-4 text-base leading-8 text-charcoal/70">
            Review the class details below, register online, or contact admissions on WhatsApp for enquiries before joining this class.
          </p>

          <dl className="mt-8 grid gap-4 text-sm text-charcoal/75">
            <div className="flex items-center justify-between gap-4 rounded-3xl bg-nude/70 px-4 py-3">
              <dt>Start date</dt>
              <dd className="font-semibold text-charcoal">{item.startDate}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-3xl bg-nude/50 px-4 py-3">
              <dt>Duration</dt>
              <dd>{item.duration}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-3xl bg-nude/50 px-4 py-3">
              <dt>Schedule</dt>
              <dd>{item.schedule}</dd>
            </div>
            {item.location ? (
              <div className="flex items-center justify-between gap-4 rounded-3xl bg-nude/50 px-4 py-3">
                <dt>Location</dt>
                <dd>{item.location}</dd>
              </div>
            ) : null}
            {item.price ? (
              <div className="flex items-center justify-between gap-4 rounded-3xl bg-nude/50 px-4 py-3">
                <dt>Fee</dt>
                <dd>{item.currency || 'GHS'} {item.price.toFixed(2)}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={registerHref(item)}>Register now</ButtonLink>
            <ButtonLink href={reserveClassWhatsAppLink(item.name)} variant="secondary" external>WhatsApp enquiries</ButtonLink>
            <ButtonLink href="/upcoming-classes" variant="ghost">Back to classes</ButtonLink>
          </div>
        </section>
      </div>
    </main>
  );
}
