// Includes body reading; a request may receive headers and then stall forever.
export async function fetchJsonDeadline(url, options = {}, {fetcher=fetch, milliseconds=15000} = {}) {
    const controller=new AbortController();let timer;
    try {
        return await Promise.race([
            (async()=>{const response=await fetcher(url,{...options,signal:controller.signal});return {response,data:await response.json()};})(),
            new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('REQUEST_TIMEOUT'));},milliseconds);}),
        ]);
    } finally {clearTimeout(timer);}
}
