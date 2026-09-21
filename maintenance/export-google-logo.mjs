import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Bike } from 'lucide-react';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { brandSVG } from '../app/lib/brand.js';

const output = new URL('../exports/google-logo/', import.meta.url);
await mkdir(output, { recursive: true });
const icon = renderToStaticMarkup(React.createElement(Bike, {
    width: 384, height: 384, strokeWidth: 1.5, color: '#35634e',
}));
const square = brandSVG();
const transparent = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><g transform="translate(64 64)">${icon}</g></svg>`;
const smallIcon = renderToStaticMarkup(React.createElement(Bike, {
    width: 104, height: 104, strokeWidth: 1.5, color: '#35634e',
}));
const full = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="192" viewBox="0 0 800 192"><g transform="translate(32 44)">${smallIcon}</g><text x="168" y="113" font-family="Arial, sans-serif" font-size="48" font-weight="600" fill="#17191d">Cycling Calendar</text></svg>`;
for (const [name, svg] of [['cycling-calendar-google', square], ['cycling-calendar-symbol-transparent', transparent], ['cycling-calendar-logo', full]]) {
    await writeFile(new URL(`${name}.svg`, output), svg);
    await sharp(Buffer.from(svg)).png().toFile(new URL(`${name}.png`, output).pathname.replace(/^\/(?=[A-Za-z]:)/, ''));
}
console.log('Logo exports created in exports/google-logo');
