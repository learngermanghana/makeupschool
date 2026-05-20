'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { reserveClassWhatsAppLink } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import { ButtonLink } from './button-link';

const filters = ['All', 'Full Programs', 'Short Courses'] as const;

function registerHref(item: import('@/data/upcoming-classes').UpcomingClass) {
  const params = new URLSearchParams();
  if (item.serviceId) params.set('courseId', item.serviceId);
  params.set('course', item.name);
  if (item.slotId) params.set('classSlotId', item.slotId);
  return `/register?${params.toString()}`;
}

export function UpcomingClassesSection({ preview = false, classes }: { preview?: boolean; classes: import('@/data/upcoming-classes').UpcomingClass[] }) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('All');

  const filteredClasses = useMemo(() => {
    const visible = activeFilter === 'All' ? classes : classes.filter((item) => item.category === activeFilter);
    return preview ? visible.slice(0, 3) : visible;
  }, [activeFilter, preview, classes]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={cn(
              'rounded-full px-5 py-2 text-sm transition',
              activeFilter === filter ? 'bg-charcoal text-white' : 'bg-white text-charcoal/70 ring-1 ring-black/10 hover:bg-nude'
            )}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {filteredClasses.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-4xl border border-black/5 bg-white shadow-card">
            <Link href={`/upcoming-classes/${item.slug}`} className="block">
              <div className="relative aspect-[4/3] bg-gradient-to-br from-blush via-white to-nude">
                <Image
                  src={item.image}
                  alt={item.imageAlt}
                  fill
                  unoptimized={item.image.startsWith('http')}
                  className="object-cover"
                  sizes="(min-width: 1280px) 33vw, (min-width: 1024px) 50vw, 100vw"
                />
              </div>
            </Link>
            <div className="p-7">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-blush px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-charcoal">{item.category}</span>
                <span className="rounded-full bg-charcoal px-4 py-2 text-xs font-medium text-white">{item.slots}</span>
              </div>
              <Link href={`/upcoming-classes/${item.slug}`} className="mt-5 block text-2xl font-semibold text-charcoal hover:underline">
                {item.name}
              </Link>
              <dl className="mt-6 space-y-4 text-sm text-charcoal/75">
                <div className="flex items-center justify-between gap-4 rounded-3xl bg-nude/70 px-4 py-3">
                  <dt>Next start</dt>
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
              </dl>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href={registerHref(item)}>Register now</ButtonLink>
                <ButtonLink href={reserveClassWhatsAppLink(item.name)} variant="secondary" external>WhatsApp enquiries</ButtonLink>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
