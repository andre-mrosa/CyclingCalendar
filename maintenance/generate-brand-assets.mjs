import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { brandSVG } from '../app/lib/brand.js';
const target = path => fileURLToPath(new URL('../' + path, import.meta.url));
const source = Buffer.from(brandSVG());
// Export the app's rounded icon container with real alpha at every size.
const rounded = size => sharp(source).resize(size,size).composite([{ input: Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * .16}" fill="white"/></svg>`), blend: 'dest-in' }]);
for (const name of ['brand.svg', 'brand-final.svg', 'logo-symbol.svg']) await writeFile(target('public/' + name), brandSVG());
for (const [path, size] of [
 ['public/brand-final.png',512], ['public/logo-google.png',512],
 ['app/icon.png',192], ['app/apple-icon.png',180],
 ['public/icon-192x192.png',192], ['public/icon-512x512.png',512],
 ['public/logo.jpg',512], ['public/icon.jpg',192],
 ['public/icon-192x192.jpg',192], ['public/icon-512x512.jpg',512],
]) {
 const output = path.endsWith('.png') ? rounded(size) : sharp(source).resize(size,size);
 await output.toFile(target(path));
}
await sharp({create:{width:512,height:512,channels:3,background:'#ffffff'}})
 .composite([{input:await sharp(source).resize(360,360).png().toBuffer(),gravity:'centre'}])
 .png().toFile(target('public/brand-maskable.png'));
const sizes = [16, 32, 48, 64];
const images = await Promise.all(sizes.map(size => rounded(size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
let offset = header.length;
for (let i = 0; i < images.length; i++) {
 const entry = 6 + i * 16;
 header[entry] = sizes[i]; header[entry + 1] = sizes[i];
 header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
 header.writeUInt32LE(images[i].length, entry + 8); header.writeUInt32LE(offset, entry + 12);
 offset += images[i].length;
}
for (const path of ['public/favicon.ico', 'app/favicon.ico']) await writeFile(target(path), Buffer.concat([header, ...images]));
