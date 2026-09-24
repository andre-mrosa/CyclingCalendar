import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

export function publicAddress(address) {
    try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}
export async function resolvePublicUrl(value, resolver = lookup) {
    let url;
    try { url = new URL(value); } catch { throw new Error('URL inválida'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw new Error('URL não permitida');
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = ipaddr.isValid(host) ? [{ address: host, family: ipaddr.parse(host).kind() === 'ipv4' ? 4 : 6 }] : await resolver(host, { all: true });
    if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new Error('Destino não permitido');
    return { url, address: addresses[0] };
}
// Pin each connection to a validated IP, including every redirect. Never forward credentials.
export async function readPublicResource(value, { maxBytes = 10 * 1024 * 1024, timeoutMs = 10000, redirects = 3, accept = '*/*' } = {}) {
    const deadline = Date.now() + timeoutMs;
    let current = value;
    for (let hop = 0; hop <= redirects; hop++) {
        const { url, address } = await resolvePublicUrl(current);
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error('Tempo de resposta excedido');
        const result = await new Promise((resolve, reject) => {
            const request = (url.protocol === 'https:' ? https : http).get(url, {
                headers: { 'User-Agent': 'CyclingCalendar/2.0', Accept: accept, 'Accept-Encoding': 'identity', Referer: url.origin + '/' },
                lookup: (_host, options, callback) => options?.all ? callback(null, [address]) : callback(null, address.address, address.family),
            }, response => {
                if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
                    const redirect = response.headers.location;
                    response.resume();
                    if (!redirect) reject(new Error('Redirecionamento inválido')); else resolve({ redirect });
                    return;
                }
                if (response.statusCode !== 200 || Number(response.headers['content-length']) > maxBytes) {
                    response.destroy(); reject(new Error('Recurso indisponível ou demasiado grande')); return;
                }
                const chunks = []; let size = 0;
                response.on('data', chunk => {
                    size += chunk.length;
                    if (size > maxBytes) { response.destroy(new Error('Recurso demasiado grande')); return; }
                    chunks.push(chunk);
                });
                response.on('error', reject);
                response.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: String(response.headers['content-type'] || '').split(';')[0].toLowerCase() }));
            });
            const timer = setTimeout(() => request.destroy(new Error('Tempo de resposta excedido')), remaining);
            request.on('close', () => clearTimeout(timer));
            request.on('error', reject);
        });
        if (!result.redirect) return result;
        current = new URL(result.redirect, url).href;
    }
    throw new Error('Demasiados redirecionamentos');
}
export function rasterImageType(buffer) {
    if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
    if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
    if (/^GIF8[79]a$/.test(buffer.subarray(0, 6).toString())) return 'image/gif';
    if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
    if (buffer.subarray(4, 8).toString() === 'ftyp' && ['avif', 'avis'].includes(buffer.subarray(8, 12).toString())) return 'image/avif';
    return null;
}
