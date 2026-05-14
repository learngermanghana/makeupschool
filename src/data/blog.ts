import { getSedifexPublicBlog, type SedifexBlogPost } from '@/lib/server/sedifex';

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  imageUrl?: string;
  linkUrl?: string;
  publishedAt?: string;
};

const fallbackPosts: BlogPost[] = [
  {
    id: 'fallback-1',
    title: 'How to prepare for your first beauty class',
    slug: 'how-to-prepare-for-your-first-beauty-class',
    content: '<p>Bring your notepad, arrive early, and come ready for practical learning.</p>',
    excerpt: 'Bring your notepad, arrive early, and come ready for practical learning.',
    publishedAt: '2026-04-01T10:00:00.000Z'
  }
];

function stripHtml(input = '') {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toExcerpt(content?: string) {
  const plain = stripHtml(content);
  return plain.length > 160 ? `${plain.slice(0, 157)}...` : plain;
}

function mapPost(post: SedifexBlogPost): BlogPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content || '',
    excerpt: toExcerpt(post.content),
    imageUrl: post.imageUrl,
    linkUrl: post.linkUrl,
    publishedAt: post.publishedAt
  };
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const payload = await getSedifexPublicBlog();
    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (items.length) return items.map(mapPost);
  } catch (error) {
    console.warn('Falling back to local blog posts:', error);
  }
  return fallbackPosts;
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug) || null;
}
