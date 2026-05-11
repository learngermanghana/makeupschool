import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { getSedifexGallery } from '@/lib/server/sedifex';

export type GalleryItem = {
  title: string;
  category: string;
  image: string;
};

const GALLERY_DIR = path.join(process.cwd(), 'public/uploads/gallery');
const GALLERY_WEB_PATH = '/uploads/gallery';

export async function getGalleryItems(): Promise<GalleryItem[]> {
  try {
    const sedifex = await getSedifexGallery();
    if (sedifex?.gallery?.length) {
      return sedifex.gallery
        .filter((item: { isPublished?: boolean }) => item.isPublished !== false)
        .sort((a: { sortOrder?: number }, b: { sortOrder?: number }) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
        .map((item: { caption?: string; alt?: string; url: string }) => ({
          title: item.caption || item.alt || 'School Gallery',
          category: 'Sedifex Gallery',
          image: item.url
        }));
    }
  } catch (error) {
    console.warn('Falling back to local gallery files:', error);
  }

  const entries = await readdir(GALLERY_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(jpe?g|png|webp|avif|svg)$/i.test(entry.name))
    .map((entry) => ({ title: entry.name.replace(/\.[^.]+$/, ''), category: 'School Gallery', image: `${GALLERY_WEB_PATH}/${entry.name}` }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
