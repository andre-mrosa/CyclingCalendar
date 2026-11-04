'use client';
import useSWR from 'swr';
import {Panel,Empty,Notice,Status,RefreshButton,dateTime,number} from './ui';
import {sourceScope} from '../../utils/adminPresentation';
import styles from '../admin.module.css';
const labels={partial:'Recolha incompleta',volume_drop:'Queda no número de provas',unknownDiscipline:'Modalidades por confirmar',unknownCategories:'Escalões por confirmar',invalidDates:'Datas não interpretáveis',duplicatePages:'Páginas de origem repetidas',unreadCandidates:'Páginas sem leitura válida',unavailablePages:'Páginas removidas ou indisponíveis',discovery_drop:'Queda no número de páginas descobertas'};
export default function SourceQuality(){
 const {data,error,isValidating,mutate}=useSWR('/api/admin/data-quality',async url=>{const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Não foi possível consultar a qualidade.');return response.json();},{refreshInterval:60000});
 const ordered=[...(data?.snapshots||[])].sort((a,b)=>Number(b.issues.some(issue=>['partial','unreadCandidates','invalidDates','volume_drop','discovery_drop'].includes(issue.code)))-Number(a.issues.some(issue=>['partial','unreadCandidates','invalidDates','volume_drop','discovery_drop'].includes(issue.code))));
 return <Panel title="Saúde das fontes" description="Falhas de recolha primeiro. Dados por confirmar são avisos e não retiram provas do calendário." action={<RefreshButton busy={isValidating} onClick={()=>mutate()}/>}>
 {error&&<Notice error>{error.message}</Notice>}{!data&&!error&&<Empty busy/>}{data?.snapshots.length===0&&<Empty>A próxima sincronização produzirá o primeiro relatório.</Empty>}
 <div className={styles.qualityList}>{ordered.map(row=>{
 const coverage=row.metrics.coverage,failures=row.issues.filter(issue=>['partial','unreadCandidates','invalidDates','volume_drop','discovery_drop'].includes(issue.code)),warnings=row.issues.filter(issue=>!failures.includes(issue));
 return <article key={row.id} className={styles.qualityRow}><div className={styles.sectionHeading}><div><h3>{sourceScope(row.scopeKey)}</h3><p>{dateTime(row.createdAt)} · {number(row.metrics.processed)} provas verificadas</p></div><Status value={failures.length?'partial':warnings.length?'WARN':'success'}>{failures.length?'Rever recolha':warnings.length?'Dados por confirmar':'Sem anomalias'}</Status></div>
 {failures.length>0&&<ul className={styles.issueList}>{failures.map(issue=><li key={issue.code}>{labels[issue.code]||issue.code}{issue.code!=='partial'?`: ${number(issue.value)}`:''}{issue.previous!==undefined?` · anterior: ${number(issue.previous)}`:''}</li>)}</ul>}
 {warnings.length>0&&<p className={styles.muted}>{warnings.map(issue=>`${labels[issue.code]||issue.code}: ${number(issue.value)}`).join(' · ')}</p>}
 <details className={styles.details}><summary>Ver cobertura da recolha</summary>{coverage?<dl className={styles.runMetrics}>{[['Páginas descobertas',coverage.discovered],['Processadas',coverage.saved],['Eventos passados',coverage.past],['Outras modalidades',coverage.nonCycling],['Fora das épocas',coverage.outsideYears],['Removidas',coverage.unavailable],['Por resolver',(coverage.failed||0)+(coverage.unresolved||0)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{number(value)}</dd></div>)}</dl>:<p className={styles.muted}>Sem detalhe de cobertura nesta medição.</p>}</details></article>;
 })}</div></Panel>;
}
