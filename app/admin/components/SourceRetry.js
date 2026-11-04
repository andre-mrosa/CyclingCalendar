'use client';
import {useState} from 'react';
import useSWR from 'swr';
import {Clock3} from 'lucide-react';
import {Button,Notice,dateTime} from './ui';
import styles from '../admin.module.css';
export default function SourceRetry(){
    const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
    const {data,error,mutate}=useSWR('/api/admin/scraper-retry',async url=>{const response=await fetch(url,{cache:'no-store'});const value=await response.json();if(!response.ok)throw Error(value.error);return value;},{refreshInterval:15000});
    async function schedule(){setBusy(true);setMessage('');try{const response=await fetch('/api/admin/scraper-retry',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const value=await response.json();if(!response.ok)throw Error(value.error);await mutate();}catch(error){setMessage(error.message||'Não foi possível agendar.');}finally{setBusy(false);}}
    if(error)return <Notice error>{error.message}</Notice>;
    if(!data||['completed','cancelled'].includes(data.status)||data.status==='none'&&!data.scheduledAt)return null;
    return <div className={styles.retryNotice} role="status"><Clock3 size={20}/><div><strong>{data.status==='running'?'Retoma automática de Stop & Go em curso':['scheduled','scheduling'].includes(data.status)?'Retoma automática de Stop & Go agendada':data.status==='exhausted'?'Stop & Go continua a limitar os pedidos':'Retoma automática de Stop & Go'}</strong><p>{['scheduled','scheduling'].includes(data.status)?`${dateTime(data.scheduledAt)} · Um minuto depois do prazo da fonte. Funciona com o navegador fechado.`:data.status==='running'?'A consultar apenas esta fonte, com pedidos espaçados.':data.status==='exhausted'?'O limite de três tentativas automáticas foi atingido. A próxima sincronização volta a avaliar a fonte.':'É possível agendar a retoma do período de espera já registado.'}</p>{message&&<p>{message}</p>}</div>{['none','failed','exhausted'].includes(data.status)&&<Button disabled={busy} onClick={schedule}>{busy?'A agendar…':'Agendar retoma'}</Button>}</div>;
}
