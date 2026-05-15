import { readdir } from 'node:fs/promises';
import path from 'node:path';

export type GalleryItem = {
  title: string;
  category: string;
  image: string;
};

const GALLERY_DIR = path.join(process.cwd(), 'public/uploads/gallery');
const GALLERY_WEB_PATH = '/uploads/gallery';
const SUPPORTED_EXTENSIONS = /\.(jpe?g|png|webp|avif)$/i;
const EXCLUDED_FILE_STEMS = new Set(['braids-and-protective-styling', 'student-practical-facial-session']);

function toProfessionalTitle(index: number) {
  return `Student Signature Look ${String(index + 1).padStart(2, '0')}`;
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  const entries = await readdir(GALLERY_DIR, { withFileTypes: true });

  const fileNames = entries
    .filter((entry) => entry.isFile() && SUPPORTED_EXTENSIONS.test(entry.name))
    .map((entry) => entry.name)
    .filter((name) => !EXCLUDED_FILE_STEMS.has(name.replace(/\.[^.]+$/, '').toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  return fileNames.map((fileName, index) => ({
    title: toProfessionalTitle(index),
    category: 'Student Work',
    image: `${GALLERY_WEB_PATH}/${fileName}`
  }));
}
