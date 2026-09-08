import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { brandSVG } from '../app/lib/brand.js';
const target = path => fileURLToPath(new URL('../' + path, import.meta.url));
const source = target('public/logo-source.png');
// Export the app's rounded icon container with real alpha at every size.
const rounded = size => sharp(source).resize(size,size).composite([{ input: Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * .16}" fill="white"/></svg>`), blend: 'dest-in' }]);
for (const name of ['brand.svg', 'brand-final.svg', 'logo-symbol.svg']) await writeFile(target('public/' + name), brandSVG());
for (const [path, size] of [
 ['public/brand-final.png',512], ['public/logo-google.png',120],
 ['app/icon.png',192], ['app/apple-icon.png',180],
 ['public/icon-192x192.png',192], ['public/icon-512x512.png',512],
 ['public/logo.jpg',512], ['public/icon.jpg',192],
 ['public/icon-192x192.jpg',192], ['public/icon-512x512.jpg',512],
]) {
 const output = path.endsWith('.png') ? rounded(size) : sharp(source).resize(size,size);
 await output.toFile(target(path));
}
await sharp({create:{width:512,height:512,channels:3,background:'#0e0e0d'}})
 .composite([{input:await sharp(source).resize(360,360).png().toBuffer(),gravity:'centre'}])
 .png().toFile(target('public/brand-maskable.png'));
const png = await rounded(32).png().toBuffer();
const ico = Buffer.alloc(22);
ico.writeUInt16LE(1,2); ico.writeUInt16LE(1,4);
ico[6]=32; ico[7]=32; ico.writeUInt16LE(1,10); ico.writeUInt16LE(32,12);
ico.writeUInt32LE(png.length,14); ico.writeUInt32LE(22,18);
for(const path of ['public/favicon.ico','app/favicon.ico']) await writeFile(target(path),Buffer.concat([ico,png]));
