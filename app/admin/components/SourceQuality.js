'use client';
import useSWR from 'swr';
import {Panel,Empty,Notice,dateTime} from './ui';
const labels={partial:'Recolha parcial',volume_drop:'Queda no número de provas',unknownDiscipline:'Modalidade por confirmar',unknownCategories:'Escalões por confirmar',invalidDates:'Datas não interpretáveis',duplicatePages:'Página de origem repetida'};
export default function SourceQuality(){
    const {data,error,mutate}=useSWR('/api/admin/data-quality',async url=>{const r=await fetch(url);if(!r.ok)throw Error('Não foi possível consultar a qualidade.');return r.json();},{refreshInterval:60000});
    return <Panel title="Qualidade automática dos dados" description="Compara cada fonte com a recolha anterior. Os avisos não apagam nem escondem provas." action={<button type="button" onClick={()=>mutate()}>Atualizar</button>}>
        {error&&<Notice error>{error.message}</Notice>}
        {!data&&!error&&<p>A consultar…</p>}
        {data?.snapshots.length===0&&<Empty>Sem medições ainda. A próxima sincronização produzirá o primeiro relatório.</Empty>}
        {data?.snapshots.map(row=><section key={row.id} className="border-t border-line py-4"><strong>{row.scopeKey}</strong><p>{dateTime(row.createdAt)} · {row.metrics.processed} provas verificadas</p>{row.issues.length?<ul>{row.issues.map(issue=><li key={issue.code}>{labels[issue.code]||issue.code}: {issue.value}{issue.previous!==undefined?` (anterior: ${issue.previous})`:''}</li>)}</ul>:<p>Sem anomalias detetadas nesta medição.</p>}</section>)}
    </Panel>;
}
