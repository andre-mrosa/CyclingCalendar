import { useTranslation } from '../i18n/useTranslation';
import { isCancelled, lisbonWallClock } from '../utils/planning';
import styles from './site.module.css';

export default function AgendaOverview({ events, onSelect }) {
    const { t, language } = useTranslation();
    const now = lisbonWallClock();
    const upcoming = events.filter(e => !isCancelled(e) && e.sortDate && String(e.sortDate).slice(0, 10) >= now.slice(0, 10))
        .sort((a, b) => new Date(a.sortDate) - new Date(b.sortDate));
    const end = new Date(now); end.setUTCDate(end.getUTCDate() + 7);
    const closing = upcoming.filter(e => e.registrationClosesAt && e.registrationClosesAt >= now && e.registrationClosesAt <= end.toISOString())
        .sort((a, b) => new Date(a.registrationClosesAt) - new Date(b.registrationClosesAt));
    const date = value => new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(value));
    return <aside className={styles.agendaOverview}>
        <p>{t('planning_agenda_help')}</p>
        {upcoming[0] && <div><h2>{t('planning_next')}</h2><button onClick={() => onSelect(upcoming[0])}>{date(upcoming[0].sortDate)} · {upcoming[0].title}</button></div>}
        <div><h2>{t('planning_deadlines')}</h2>{closing.length ? <ul>{closing.map(e => <li key={e.id}><button onClick={() => onSelect(e)}>{date(e.registrationClosesAt)} · {e.title}</button></li>)}</ul> : <p>{t('planning_no_deadlines')}</p>}</div>
    </aside>;
}
