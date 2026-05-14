import type { MetadataRoute } from 'next';
import { getCourses } from '@/data/courses';
import { getProducts } from '@/data/products';
import { siteConfig } from '@/data/site';

const routes = ['', '/courses', '/upcoming-classes', '/gallery', '/products', '/register', '/contact'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courses, products] = await Promise.all([getCourses(), getProducts()]);

  const staticRoutes: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.8
  }));

  const courseRoutes: MetadataRoute.Sitemap = courses.map((course) => ({
    url: `${siteConfig.url}/courses/${course.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteConfig.url}/products/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7
  }));

  return [...staticRoutes, ...courseRoutes, ...productRoutes];
}
