import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getCourseBySlug, getCourses } from '@/data/courses';
import { ButtonLink } from '@/components/button-link';
import { registerWhatsAppLink } from '@/lib/whatsapp';

export async function generateStaticParams() {
  const courses = await getCourses();
  return courses.map((course) => ({ slug: course.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: 'Course not found' };
  return { title: course.name, description: course.summary };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  return (
    <article className="section-shell py-16 sm:py-20">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-semibold text-charcoal">{course.name}</h1>
        <div className="relative aspect-[16/9] overflow-hidden rounded-3xl">
          <Image src={course.image} alt={course.imageAlt} fill className="object-cover" sizes="100vw" />
        </div>
        <p className="text-base leading-8 text-charcoal/85">{course.summary}</p>
        <div className="flex gap-3">
          <ButtonLink href="/register" variant="primary">Apply now</ButtonLink>
          <ButtonLink href={registerWhatsAppLink(course.name)} variant="secondary" external>
            Ask on WhatsApp
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
