import { useState } from 'react';
import { Info } from 'lucide-react';
import { Empty, Metric, Panel, RefreshButton, number } from './ui';
import styles from '../admin.module.css';

export default function Inventory({ events, busy, refresh }) {
    const [year, setYear] = useState('all');
    const years = events?.byYear || [];
    const selected = year === 'all' ? events : years.find(row => String(row.year) === year);
    const sources = year === 'all' && events?.sources ? events.sources : [
        { id: 'fpc', name: 'FPCiclismo', count: selected?.fpc },
        { id: 'cabreira', name: 'Cabreira Solutions', count: selected?.cabreira },
        { id: 'stopAndGo', name: 'Stop & Go', count: selected?.stopAndGo },
        ...(events?.sources || []).filter(source => !['fpc', 'cabreira', 'stopAndGo'].includes(source.id)).map(source => ({ id: source.id, name: source.name, count: selected?.[source.id] })),
    ];
    return <div className={styles.stack}>
        <div className={styles.sectionHeading}><div><h2>Inventário do calendário</h2><p>O que está publicado, o que está guardado e de onde vem.</p></div><RefreshButton busy={busy} onClick={refresh} /></div>
        <div className={styles.metrics}>
            <Metric label="Provas publicadas" value={events?.total} note="Provas únicas visíveis no calendário" accent />
            <Metric label="Registos guardados" value={events?.storedTotal} note="Total na base de dados, incluindo quarentena" />
            <Metric label="Em quarentena" value={events?.quarantined} note="Excluídos do calendário público" />
            <Metric label="Com várias fontes" value={events?.multiSource} note="Já incluídas nas provas publicadas" />
        </div>
        <div className={styles.explainer}><Info size={18} /><p><strong>Inventário não é atividade de scraping.</strong> Os registos processados numa execução podem atualizar provas existentes. Não são novas provas nem devem ser somados ao inventário.</p></div>
        <Panel title="Publicação por ano" description="Cada prova é contada uma vez no total publicado. As colunas de fontes podem sobrepor-se." action={<label className={styles.inlineField}>Ano<select value={year} onChange={event => setYear(event.target.value)}><option value="all">Todos os anos</option>{years.map(row => <option key={String(row.year)} value={String(row.year)}>{row.year ?? 'Sem ano'}</option>)}</select></label>}>
            {years.length ? <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Ano</th><th>Publicadas únicas</th><th>FPC</th><th>Cabreira</th><th>Stop & Go</th><th>Várias fontes¹</th></tr></thead><tbody>{years.filter(row => year === 'all' || String(row.year) === year).map(row => <tr key={row.year}><th scope="row">{row.year ?? 'Sem ano'}</th><td><strong>{number(row.total)}</strong></td><td>{number(row.fpc)}</td><td>{number(row.cabreira)}</td><td>{number(row.stopAndGo)}</td><td>{number(row.multiSource)}</td></tr>)}</tbody></table></div> : <Empty busy={busy}>O detalhe por ano ainda não está disponível.</Empty>}
            <p className={styles.footnote}>¹ Subconjunto das publicadas, não um total adicional.</p>
        </Panel>
        <div className={styles.twoColumns}>
            <Panel title="Cobertura das fontes" description={`${year === 'all' ? 'Todos os anos' : year} · ${number(selected?.total)} provas únicas publicadas`}>
                <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Fonte</th><th>Publicadas</th><th>Exclusivas</th></tr></thead><tbody>{sources.map(source => <tr key={source.id}><th scope="row">{source.name}</th><td>{number(source.count)}</td><td>{number(source.exclusive)}</td></tr>)}</tbody></table></div>
                <p className={styles.footnote}>Uma prova pode pertencer a várias fontes. Não somar estas linhas. Exclusivas = provas que só existem nessa fonte. — = não disponibilizado.</p>
            </Panel>
            <Panel title="Qualidade e horizonte" description="Cobertura global das provas publicadas, em todos os anos.">
                <dl className={styles.definitionList}>{[['Próximas provas', events?.upcoming], ['Provas passadas', events?.past], ['Sem data', events?.undated], ['Com programa / regulamento', events?.withProgramme], ['Com cartaz', events?.withImage], ['Com prazo de inscrição', events?.withRegistration], ['Com preços', events?.withPrices]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number(value)}</dd></div>)}</dl>
            </Panel>
        </div>
    </div>;
}
