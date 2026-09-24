import fs from 'node:fs/promises';
import path from 'node:path';
export async function readLocalGpx(url) {
    if (typeof url !== 'string' || !url.startsWith('/media/events/') || /[\\?#\0]/.test(url) || path.extname(url).toLowerCase() !== '.gpx') throw new Error('Caminho inválido');
    const root = path.resolve(process.cwd(), 'public/media/events');
    const target = path.resolve(process.cwd(), 'public', url.slice(1));
    const inside = file => file.startsWith(root + path.sep);
    if (!inside(target)) throw new Error('Caminho inválido');
    try {
        const real = await fs.realpath(target);
        if (!inside(real)) throw new Error('Caminho inválido');
        const stat = await fs.stat(real);
        if (!stat.isFile() || stat.size > 10 * 1024 * 1024) throw new Error('Ficheiro inválido');
        return await fs.readFile(real);
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
