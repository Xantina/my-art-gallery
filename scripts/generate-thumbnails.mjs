import { readFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const images = JSON.parse(await readFile(new URL('src/data/artwork-images.json', root), 'utf8'));
await mkdir(new URL('public/thumbnails/', root), { recursive: true });

for (const [image, filename] of Object.entries(images)) {
  const source = new URL(`src/assets/${filename}`, root);
  const output = new URL(`public/thumbnails/${image.slice(1).replace(/\.[^.]+$/, '.webp')}`, root);
  const sourceInfo = await stat(source);
  const outputInfo = await stat(output).catch(() => null);
  if (outputInfo && outputInfo.mtimeMs >= sourceInfo.mtimeMs) continue;
  await sharp(fileURLToPath(source))
    .rotate()
    .resize({ width: 480, height: 680, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(fileURLToPath(output));
}
console.log('Gallery thumbnails ready.');
