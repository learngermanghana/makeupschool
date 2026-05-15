import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/button-link';
import { getProductBySlug, getProducts } from '@/data/products';
import { toDescriptionBlocks } from '@/lib/content-format';
import { productWhatsAppLink } from '@/lib/whatsapp';

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: 'Product not found' };

  return {
    title: `${product.name} | Products`,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` }
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const descriptionBlocks = toDescriptionBlocks(product.description);

  return (
    <article className="section-shell py-16 sm:py-20">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-semibold text-charcoal">{product.name}</h1>
        <div className="relative aspect-[16/9] overflow-hidden rounded-3xl">
          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="100vw" />
        </div>
        <p className="inline-flex rounded-full bg-nude px-4 py-2 text-sm font-medium text-charcoal">{product.price}</p>
        <div className="space-y-4 text-base leading-8 text-charcoal/85">
          {descriptionBlocks.map((block) => (
            <p key={block}>{block}</p>
          ))}
        </div>
        <div className="flex gap-3">
          <ButtonLink href={productWhatsAppLink(product.name)} variant="primary" external>
            Buy / Enquire on WhatsApp
          </ButtonLink>
          <ButtonLink href="/products" variant="secondary">
            Back to products
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
