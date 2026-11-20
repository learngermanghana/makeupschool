import type { Metadata } from 'next';
import { ButtonLink } from '@/components/button-link';
import { SectionHeading } from '@/components/section-heading';
import { registerWhatsAppLink } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Register on WhatsApp',
  description: 'Ask the Make Up & More admissions team about course registration, start dates, fees and payment arrangements on WhatsApp.'
};

export default function RegisterPage() {
  return (
    <div className="section-shell py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          eyebrow="Admissions"
          title="Register for a course through WhatsApp."
          description="Talk directly with our admissions team about the course you want to study, available class dates, fees and how to complete your registration."
        />
        <div className="mt-10 rounded-4xl border border-black/5 bg-white p-8 shadow-card sm:p-10">
          <h2 className="text-2xl font-semibold text-charcoal">How to get started</h2>
          <ol className="mt-5 space-y-3 text-sm leading-7 text-charcoal/75">
            <li>1. Open WhatsApp and tell us which course interests you.</li>
            <li>2. Our admissions team will confirm current dates, availability and fees.</li>
            <li>3. Complete registration and any payment using instructions provided directly by the school.</li>
          </ol>
          <p className="mt-6 text-sm leading-7 text-charcoal/65">
            Online checkout is currently paused. You do not need to fill out a payment form on this website.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={registerWhatsAppLink()} external>Continue on WhatsApp</ButtonLink>
            <ButtonLink href="/courses" variant="secondary">Browse courses</ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
