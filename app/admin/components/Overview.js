import { Activity, Search, Heart, Download, ArrowUpRight, AlertTriangle, ClipboardCheck, Users, RefreshCw } from 'lucide-react';
import { Button, Empty, Panel, Metric, Status, dateTime, number, RefreshButton } from './ui';
import { runSummary } from '../../utils/adminPresentation';
import styles from '../admin.module.css';
function TopEventCard({title,count,max,index}) { return <div className={styles.rankingRow}><span>{index+1}</span><div><strong>{title}</strong><div className={styles.rankingBar}><i style={{width:Math.min(100,count/max*100)+'%'}}/></div></div><small>{number(count)} aberturas</small></div>; }
export default function Overview({stats,busy,refreshing,timeframe,setTimeframe,autoRefresh,setAutoRefresh,refresh,navigate,pendingDeletions,pendingSubmissions,pendingReviewCount,submissionsUnavailable,verificationErrors=[],lastRun,running}) {
 const analytics=stats?.analytics, events=stats?.events, summary=runSummary(lastRun,!!running);
 if(verificationErrors.some(error=>error?.id==='operations')){summary.status='unknown';summary.text='Não foi possível confirmar o estado atual da sincronização.';}
 const maxEventViews=Math.max(1,...(analytics?.topEvents?.map(e=>e.count)||[0]));
 const tasks=[];
 for(const error of verificationErrors)if(error)tasks.push({id:error.id,icon:AlertTriangle,title:'Não foi possível confirmar '+error.label,detail:'Abre a secção para consultar o erro e tentar novamente.'});
 if(summary.attention)tasks.push({id:'operations',icon:AlertTriangle,title:summary.problems.length?summary.problems.length+' fontes precisam de atenção':'Rever a última sincronização',detail:summary.problems.map(row=>row.name||row.id).join(' · ')||summary.text});
 if(!lastRun&&!running)tasks.push({id:'operations',icon:RefreshCw,title:'Confirmar estado da sincronização',detail:'Ainda não há um resultado confirmado.'});
 if(pendingReviewCount>0)tasks.push({id:'quarantine',icon:ClipboardCheck,title:pendingReviewCount+' exclusões por confirmar',detail:'Registos sem um motivo de exclusão detalhado.'});
 if(pendingSubmissions>0)tasks.push({id:'submissions',icon:ClipboardCheck,title:pendingSubmissions+' submissões por rever',detail:'Novas provas e correções de organizadores.'});
 if(submissionsUnavailable)tasks.push({id:'submissions',icon:AlertTriangle,title:'Não foi possível confirmar as submissões',detail:'Abre a secção para tentar novamente.'});
 if(pendingDeletions>0)tasks.push({id:'users',icon:Users,title:pendingDeletions+' pedidos de eliminação',detail:'Revê os pedidos e confirma a ação pretendida.'});
 return (<div className={styles.stack}>
 <div className={styles.hero}><div><Status value={summary.status}/><h2>{summary.attention?'Há assuntos por resolver':running?'A atualizar o calendário':'O teu calendário, num relance'}</h2><p>{summary.text}</p><p>Última conclusão: {dateTime(lastRun?.completedAt||lastRun?.completionTime)}</p></div><div className={styles.heroActions}><Button onClick={()=>navigate('operations')}>Ver sincronização</Button><RefreshButton busy={busy||refreshing} onClick={refresh}/></div></div>
 <Panel title="Precisa da tua atenção" description="Problemas de recolha e pedidos que aguardam uma decisão."><div className={styles.attentionList}>{tasks.length?tasks.map(task=><button type="button" key={task.id} className={styles.attentionRow} onClick={()=>navigate(task.id)}><task.icon size={19}/><div><strong>{task.title}</strong><p>{task.detail}</p></div><ArrowUpRight size={16}/></button>):<Empty busy={busy}>Sem ações operacionais pendentes. Consulta Qualidade para ver os avisos dos dados.</Empty>}</div></Panel>
 <div className={styles.metrics}><Metric label="Próximas provas" value={events?.upcoming} note="Publicadas no calendário" accent/><Metric label="Provas publicadas" value={events?.total} note="Inclui o histórico"/><Metric label="Exclusões automáticas" value={events?.quarantined} note="Fora do calendário público"/><Metric label="Utilizadores" value={stats?.users?.total} note="Contas registadas"/></div>
 <div className={styles.sectionHeading}><Button onClick={()=>navigate('inventory')}>Consultar provas <ArrowUpRight size={14}/></Button><label className={styles.toggle}><input type="checkbox" checked={autoRefresh} onChange={event=>setAutoRefresh(event.target.checked)}/>Atualizar a cada minuto</label></div>
            <div className="pt-8 border-t border-line">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h3 className="text-xl font-bold tracking-tight text-ink">Impacto e Audiência</h3>
                        <p className="text-sm text-muted mt-1">Atividade registada apenas com consentimento para estatísticas. Exclui dispositivos de administrador e pedidos com Do Not Track. Não representa o total de visitas nem os cliques do Google.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-surface border border-line p-1.5 rounded-xl">
                        <select aria-label="Período das estatísticas" value={timeframe} onChange={event => setTimeframe(event.target.value)} className="bg-transparent text-sm text-ink font-medium px-3 py-1.5 focus:outline-none cursor-pointer">
                            <option value="today">Hoje</option>
                            <option value="7d">Últimos 7 dias</option>
                            <option value="30d">Últimos 30 dias</option>
                            <option value="13m">Últimos 13 meses</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Activity Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-surface rounded-2xl border border-line shadow-sm p-6">
                            <h4 className="text-sm font-semibold text-ink uppercase tracking-wider mb-6">Atividade registada</h4>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity size={16}/></div>
                                        <span className="text-sm font-medium text-ink">Sessões registadas</span>
                                    </div>
                                    <span className="font-bold text-ink">{number(analytics?.sessions)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Search size={16}/></div>
                                        <span className="text-sm font-medium text-ink">Pesquisas Realizadas</span>
                                    </div>
                                    <span className="font-bold text-ink">{number(analytics?.searches)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Heart size={16}/></div>
                                        <span className="text-sm font-medium text-ink">Provas guardadas</span>
                                    </div>
                                    <span className="font-bold text-ink">{number(analytics?.favoriteChanges)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Download size={16}/></div>
                                        <span className="text-sm font-medium text-ink">Exportações p/ Agenda</span>
                                    </div>
                                    <span className="font-bold text-ink">{number(analytics?.calendarExports)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Events Column */}
                    <div className="lg:col-span-2">
                        <div className="bg-surface rounded-2xl border border-line shadow-sm p-6 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">Provas mais consultadas</h4>
                                <span className="text-xs text-muted font-medium bg-soft px-2 py-1 rounded-md">Top 5</span>
                            </div>
                            
                            {analytics?.topEvents?.length ? (
                                <div className="flex-1 flex flex-col justify-center space-y-6">
                                    {analytics.topEvents.slice(0, 5).map((event, i) => (
                                        <TopEventCard key={event.id} title={event.title} count={event.count} max={maxEventViews} index={i} />
                                    ))}
                                </div>
                            ) : (
                                <Empty busy={busy}>Ainda não há dados de visualizações suficientes.</Empty>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
