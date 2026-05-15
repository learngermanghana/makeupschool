export function cleanCatalogDescription(value?: string) {
  if (!value) return '';

  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\*\*|\*\*$/g, ''));

  const filtered = lines.filter((line) => {
    const lower = line.toLowerCase();
    return !lower.startsWith('product name:') && !lower.startsWith('item type:');
  });

  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function toDescriptionBlocks(value?: string) {
  const cleaned = cleanCatalogDescription(value);
  if (!cleaned) return [];

  return cleaned
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => block.replace(/\*\*/g, ''));
}
