'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import useSWR from 'swr';
import {useUser} from '@clerk/nextjs';
import {useOnline,useStoredString,writeStored} from './useBrowserState';
const parse=raw=>{try{const value=JSON.parse(raw);return Array.isArray(value)?value.filter(s=>s&&typeof s.id==='string'&&typeof s.name==='string'&&typeof s.path==='string'&&s.filters).slice(0,20):[];}catch{return [];}};
export function useSyncedSearches(){
    const {user,isLoaded}=useUser(),online=useOnline(),key=`cycling_searches_v1_${user?.id||'guest'}`,marker=key+'_synced',cacheKey=key+'_account_cache';
    const raw=useStoredString(key,'[]'),migrated=useStoredString(marker,''),local=useMemo(()=>parse(raw),[raw]);
    const cachedRaw=useStoredString(cacheKey,'[]'),cached=useMemo(()=>parse(cachedRaw),[cachedRaw]);
    const [busy,setBusy]=useState(false),[failure,setFailure]=useState(false),attempted=useRef(new Set());
    const {data,error,mutate}=useSWR(isLoaded&&user?['/api/searches/saved',user.id]:null,async([url])=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error();return r.json();});
    async function request(method,body){
        if(!online)throw Error('Offline');
        const r=await fetch('/api/searches/saved',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error();
        const result=await r.json();writeStored(cacheKey,JSON.stringify(result.entries));await mutate(result,false);return result;
    }
    useEffect(()=>{
        if(!user||!data||migrated||!online||attempted.current.has(key))return;
        attempted.current.add(key);
        if(!local.length){writeStored(marker,'yes');return;}
        // Keep local copies intact unless the whole account import succeeds.
        request('POST',{entries:local,importing:true}).then(()=>{writeStored(marker,'yes');setFailure(false);}).catch(()=>setFailure(true));
        // A single migration attempt per account/session; focus refreshes must not replay it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[user?.id,data,migrated,online,key,marker,raw]);
    useEffect(()=>{if(user&&data?.entries)writeStored(cacheKey,JSON.stringify(data.entries));},[user,data,cacheKey]);
    const remote=data?.entries||cached;
    const entries=!user?local:migrated?remote:[...remote,...local.filter(s=>!remote.some(row=>row.id===s.id||row.name===s.name))];
    async function change(method,entry){
        setBusy(true);setFailure(false);
        try{
            if(user){
                if(!data||!online)throw Error();
                await request(method,method==='POST'?{entries:[entry]}:{id:entry});
                if(!migrated){
                    const remaining=method==='DELETE'?local.filter(s=>s.id!==entry):local;
                    if(method==='DELETE')writeStored(key,JSON.stringify(remaining));
                    if(remaining.length)await request('POST',{entries:remaining,importing:true});
                    writeStored(marker,'yes');
                }
            }else writeStored(key,JSON.stringify(method==='POST'?[...local.filter(s=>s.name!==entry.name),entry].slice(-20):local.filter(s=>s.id!==entry)));
            return true;
        }catch{setFailure(true);return false;}finally{setBusy(false);}
    }
    const importing=!!user&&!!data&&!migrated&&local.length>0&&!failure&&online;
    return {entries,isLoaded,busy:busy||importing,failure:failure||!!error,user,save:entry=>change('POST',entry),remove:id=>change('DELETE',id),synced:!!user&&!!migrated&&!!data&&!error&&online};
}
