import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SectionHeading } from '@/components/section-heading';
import { getBlogPosts } from '@/data/blog';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Read published beauty education articles, class insights, and product guidance from Make Up & More School of Cosmetology.'
};

function formatPublishedAt(value?: string) {
  if (!value) return 'Recently published';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className="section-shell py-16 sm:py-20">
      <SectionHeading
        eyebrow="Blog"
        title="Beauty insights, student tips, and industry updates."
        description="This page pulls published posts directly from Sedifex public blog feed with graceful local fallback content."
      />
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {posts.map((post) => (
          <article key={post.id} className="overflow-hidden rounded-4xl border border-black/5 bg-white shadow-card">
            {post.imageUrl ? (
              <div className="relative aspect-[16/9]">
                <Image src={post.imageUrl} alt={post.title} fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
              </div>
            ) : null}
            <div className="space-y-4 p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{formatPublishedAt(post.publishedAt)}</p>
              <h2 className="text-2xl font-semibold text-charcoal">{post.title}</h2>
              <p className="text-sm leading-7 text-charcoal/70">{post.excerpt || 'Read the full post for details.'}</p>
              <div className="flex gap-3">
                <Link href={`/blog/${post.slug}`} className="rounded-full bg-charcoal px-5 py-3 text-sm font-medium text-white transition hover:bg-charcoal/90">
                  Continue reading
                </Link>
                <span className="rounded-full bg-nude px-4 py-3 text-sm text-charcoal/75">/{post.slug}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
