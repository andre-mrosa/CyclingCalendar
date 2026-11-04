import { assertSourceAccess, SOURCE_USER_AGENT } from './sourceAccess.js';
const eventUrl = url => url.origin==='https://apedalar.pt' && /^\/eventos\/(?:info\/)?[^/]+\/?$/.test(url.pathname) && !url.username && !url.password;
// Removed event URLs can redirect to a successful home page. Never interpret that
// home page as an event or follow a redirect outside the source's event routes.
export async function fetchApedalarPage(url, {fetcher=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
    let current=new URL(url); const visited=new Set();
    for(let hop=0;hop<4;hop++) {
        if(!eventUrl(current))return {unavailable:'O endereço já não aponta para uma página de prova.'};
        if(visited.has(current.href))throw Error('Apedalar: ciclo de redirecionamentos na página da prova');
        visited.add(current.href);
        const response=await fetcher(current.href,{redirect:'manual',headers:{'User-Agent':SOURCE_USER_AGENT},signal:AbortSignal.timeout(10000)});
        assertSourceAccess(response,'Apedalar');
        if(![301,302,303,307,308].includes(response.status))return {response};
        const location=response.headers.get('location'); await response.body?.cancel();
        if(!location)throw Error('Apedalar: redirecionamento sem destino');
        current=new URL(location,current);
        if(!eventUrl(current))return {unavailable:'A página da prova redireciona para a página inicial, uma listagem ou outra origem.'};
        if(hop<3)await wait(1000);
    }
    throw Error('Apedalar: limite de redirecionamentos da página excedido');
}
