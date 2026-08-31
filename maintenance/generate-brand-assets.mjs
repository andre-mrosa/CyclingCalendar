// Run from the repo root: node maintenance/generate-brand-assets.mjs
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { brandSVG } from '../app/lib/brand.js';

const target = path => fileURLToPath(new URL(`../${path}`, import.meta.url));
const svg = Buffer.from(brandSVG());
await writeFile(target('public/brand.svg'), svg);
for (const [path, size] of [
    ['app/icon.jpg', 192], ['app/apple-icon.jpg', 180],
    ['public/logo.jpg', 512], ['public/icon.jpg', 192],
    ['public/icon-192x192.jpg', 192], ['public/icon-512x512.jpg', 512],
]) {
    await sharp(svg, { density: 600 }).resize(size, size).flatten({ background: '#153e35' })
        .jpeg({ quality: 95 }).toFile(target(path));
}
// Maskable: all identity details fit inside the safe central circle.
await sharp({ create: { width: 512, height: 512, channels: 3, background: '#153e35' } })
    .composite([{ input: await sharp(svg, { density: 600 }).resize(400, 400).png().toBuffer(), gravity: 'centre' }])
    .png().toFile(target('public/brand-maskable.png'));
const png = await sharp(svg, { density: 600 }).resize(32, 32).png().toBuffer();
const ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
ico[6] = 32; ico[7] = 32; ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18);
await writeFile(target('public/favicon.ico'), Buffer.concat([ico, png]));
