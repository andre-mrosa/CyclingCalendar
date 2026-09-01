import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const svg = await readFile(new URL('../public/brand.svg', import.meta.url));
const navy = { r: 11, g: 23, b: 39, alpha: 1 };

async function jpeg(path, size) {
    await sharp(svg)
        .resize(size, size)
        .flatten({ background: navy })
        .jpeg({ quality: 94 })
        .toFile(fileURLToPath(new URL(path, import.meta.url)));
}

await Promise.all([
    jpeg('../public/icon-192x192.jpg', 192),
    jpeg('../public/icon-512x512.jpg', 512),
    jpeg('../public/icon.jpg', 192),
    jpeg('../public/logo.jpg', 512),
    jpeg('../app/icon.jpg', 512),
    jpeg('../app/apple-icon.jpg', 180),
    sharp(svg)
        .resize(320, 320)
        .extend({ top: 96, bottom: 96, left: 96, right: 96, background: navy })
        .png()
        .toFile(fileURLToPath(new URL('../public/brand-maskable.png', import.meta.url))),
]);
