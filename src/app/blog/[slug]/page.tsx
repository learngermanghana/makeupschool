import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getBlogPostBySlug, getBlogPosts } from '@/data/blog';

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: 'Post not found' };
  return { title: post.title, description: post.excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="section-shell py-16 sm:py-20">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-semibold text-charcoal">{post.title}</h1>
        {post.imageUrl ? (
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl">
            <Image src={post.imageUrl} alt={post.title} fill className="object-cover" sizes="100vw" />
          </div>
        ) : null}
        <div className="whitespace-pre-line text-base leading-8 text-charcoal/85">{post.content}</div>
      </div>
    </article>
  );
}
