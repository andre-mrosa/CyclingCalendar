import { useRef } from 'react';
import { ArrowUpRight, Bookmark, Share2, X, CalendarPlus } from 'lucide-react';
import EventRouteProfile from './EventRouteProfile';
import WeatherWidget from './WeatherWidget';
import { eventDateDisplay } from '../utils/eventDateDisplay';
import { formatEventTitle } from '../utils/calendarPresentation';
import { formatEventLocation, extractEventTown } from '../utils/eventLocation';
import { getEventDiscipline } from '../utils/eventClassifier';
import { translateTag, translateDateString, translateEscalao, translateAmbito, translateLicenca } from '../i18n/formatters';
import { registrationPriceSummary } from '../utils/registrationDates';
import { isCancelled, registrationDaysUntil } from '../utils/planning';
import styles from './eventDetail.module.css';

export default function EventDetailBody({ event, t, language, standalone, closeModal, favorite, toggleFavorite, handleShare, shareCopied, routes, documents, links, schedule, programHtml, descriptionHtml, bannerHtml, handleHtmlClick, loading, formatRegDate, isSignedIn, reminders, onReminder, children }) {
    const registrationRef = useRef(null);
    const dates = eventDateDisplay(event);
    const translation = event.translations?.find(item => item.language === language) || (language !== 'pt' ? event.translations?.find(item => item.language === 'en') : null);
    const title = formatEventTitle(language === 'pt' ? event.title : translation?.title || event.title);
    const Heading = standalone ? 'h1' : 'h2';
    const hasRegistration = links.registrationList.length > 0 || event.prices || event.registrationOpensAt || event.registrationClosesAt;
    const hasRoutes = routes.length > 0 || event.gpxData || documents.some(doc => doc.format === 'GPX');
    const hasProgram = schedule?.type === 'timeline' || (programHtml && !(documents.length && event.source?.includes('FPC')));
    const closed = event.registrationClosesAt && registrationDaysUntil(event.registrationClosesAt) < 0;
    const cancelled = isCancelled(event);
    const location = formatEventLocation(event);
    const resourceLinks = [...documents, ...links.resources, links.primaryRules && { ...links.primaryRules, label: t('action_rules') }, links.primaryResults && { ...links.primaryResults, label: t('action_results') }, links.officialSite].filter(Boolean).filter((item, index, all) => all.findIndex(other => other.link === item.link) === index);
    return <div className={styles.body}>
        {!standalone && <button className={styles.close} onClick={closeModal} aria-label={t('action_close')}><X size={20} /></button>}
        <header className={styles.hero}>
            <div className={styles.date} aria-hidden="true">
                {dates.start ? <>{[dates.start, ...(dates.singleDay ? [] : [dates.end])].map((date, index) => <div key={date}>
                    {index > 0 && <span className={styles.connector} />}
                    {(index === 0 || dates.start.slice(0, 7) !== dates.end.slice(0, 7)) && <small>{new Intl.DateTimeFormat(language, { month: 'short', timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'))}</small>}
                    <time dateTime={date}>{Number(date.slice(8))}</time>
                </div>)}</> : '—'}
            </div>
            <div className={styles.titleBlock}>
                <p className={styles.kicker}>{translateTag(getEventDiscipline(event), language) || t('summary_cycling')}</p>
                <Heading>{title}</Heading>
                <p>{location || t('summary_location_tbd')}</p>
                <p className={styles.muted}>{dates.start ? translateDateString(event.date, language) : t('planning_date_unconfirmed')}</p>
            </div>
        </header>
        {cancelled && <p className={styles.notice} role="status">{t('planning_cancelled')}</p>}
        <div className={styles.actions}>
            {hasRegistration && <button className={styles.primary} onClick={() => { registrationRef.current.open = true; registrationRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' }); }}>{t('tab_registration')}<ArrowUpRight size={16} /></button>}
            <button className={styles.button} onClick={() => toggleFavorite(event.id)} aria-pressed={!!favorite}><Bookmark size={16} fill={favorite ? 'currentColor' : 'none'} />{t(favorite ? 'card_remove_favorite' : 'card_add_favorite')}</button>
            <button className={styles.button} onClick={handleShare}><Share2 size={16} />{t(shareCopied ? 'action_copied' : 'action_share')}</button>
        </div>
        {loading && <p className={styles.muted} role="status">{t('action_loading_data')}</p>}
        {hasRoutes && <section className={styles.section}>
            <h3>{t('summary_routes_distances')}</h3>
            <div className={styles.routes}>{routes.map((route, index) => <div className={styles.route} key={index}>{route}</div>)}</div>
            <EventRouteProfile event={event} documents={documents} />
        </section>}
        {hasProgram && <details className={styles.section} open>
            <summary>{t('tab_schedule')}</summary>
            <div className={styles.content}>{schedule?.type === 'timeline' ? schedule.days.map((day, index) => <section className={styles.scheduleDay} key={index}>
                <h4>{day.dayTitle}</h4>
                {day.activities.map((activity, activityIndex) => <div className={styles.activity} key={activityIndex}>
                    <time>{activity.time || '—'}</time><div><p>{activity.title}</p>{activity.desc && <p className={styles.muted}>{activity.desc}</p>}{activity.location && (activity.locationUrl ? <a href={activity.locationUrl} target="_blank" rel="noopener noreferrer">{activity.location}<ArrowUpRight size={14} /></a> : <p className={styles.muted}>{activity.location}</p>)}</div>
                </div>)}
            </section>) : <div className={styles.richText} dangerouslySetInnerHTML={{ __html: programHtml }} onClick={handleHtmlClick} />}</div>
        </details>}
        {hasRegistration && <details className={styles.section} ref={registrationRef}>
            <summary>{t('tab_registration')}</summary>
            <div className={styles.content}>
                {closed && <p className={styles.notice}>{t('planning_registration_closed')}</p>}
                <div className={styles.registrationDates}>{['open', 'close'].map(kind => {
                    const value = kind === 'open' ? event.registrationOpensAt : event.registrationClosesAt;
                    if (!value) return null;
                    const reminder = reminders[kind];
                    const marked = reminder.status === 'success' || reminder.status === 'exists';
                    return <div key={kind}><p className={styles.muted}>{t(kind === 'open' ? 'reg_open_title' : 'reg_close_title')}</p><p>{formatRegDate(value)}</p>{isSignedIn && <button className={styles.button} disabled={reminder.status === 'loading'} onClick={() => onReminder(kind, marked)}><CalendarPlus size={15} />{reminder.status === 'loading' ? t('action_marking') : marked ? t('action_remove_confirm') : t(kind === 'open' ? 'reg_remind_open' : 'reg_remind_close')}</button>}{reminder.status === 'error' && <p role="alert">{reminder.message}</p>}</div>;
                })}</div>
                {registrationPriceSummary(event.prices) && <p className={styles.price}>{registrationPriceSummary(event.prices)}</p>}
                {event.prices && <details className={styles.nested}><summary>{t('planning_registration_details')}</summary><div className={styles.richText} dangerouslySetInnerHTML={{ __html: event.prices }} /></details>}
                <div className={styles.actions}>{links.registrationList.map((link, index) => <a key={link.link} className={cancelled || closed ? styles.button : styles.primary} href={link.link} target="_blank" rel="noopener noreferrer">{t(closed || cancelled ? 'planning_registration_page' : 'action_register')}{links.registrationList.length > 1 && ` · ${link._plat || index + 1}`}<ArrowUpRight size={16} /></a>)}</div>
            </div>
        </details>}
        {location && <details className={styles.section}>
            <summary>{t('tab_location')}</summary><div className={styles.content}><p>{location}</p><p className={styles.muted}>{t('planning_map_approx')}</p><iframe className={styles.map} title={t('tab_location')} loading="lazy" allowFullScreen src={`https://maps.google.com/maps?q=${encodeURIComponent(location + ', Portugal')}&output=embed`} />
                {dates.start && <div className={styles.weather}><WeatherWidget location={extractEventTown(event) || event.distrito} distrito={event.distrito} date={dates.start} variant="header" /><p className={styles.muted}>{t('planning_weather_day')}: {new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(dates.start + 'T00:00:00Z'))}</p></div>}
            </div>
        </details>}
        {(event.organizador || resourceLinks.length > 0 || event.escaloes?.length > 0 || event.ambito || event.licenca) && <details className={styles.section}>
            <summary>{t('detail_organization_documents')}</summary><div className={styles.content}>
                {event.organizador && <p>{event.organizador}</p>}
                {event.ambito && <p className={styles.muted}>{translateAmbito(event.ambito, language)}</p>}
                {event.licenca && <p>{t('summary_scope_license')}: {translateLicenca(event.licenca, language)}</p>}
                {event.escaloes?.length > 0 && <p>{t('tab_categories')}: {event.escaloes.map(category => translateEscalao(category, language)).join(' · ')}</p>}
                <div className={styles.resources}>{resourceLinks.map(link => <a key={link.link} href={link.link} target="_blank" rel="noopener noreferrer">{link.label}<ArrowUpRight size={16} /></a>)}</div>
            </div>
        </details>}
        {(event.prizes || event.insurance) && <details className={styles.section}><summary>{t('detail_prizes_insurance')}</summary><div className={styles.content}>{[['prizes', 'summary_prizes'], ['insurance', 'summary_insurance']].filter(([key]) => event[key]).map(([key, label]) => <section key={key}><h4>{t(label)}</h4><div className={styles.richText} dangerouslySetInnerHTML={{ __html: event[key] }} /></section>)}</div></details>}
        {(descriptionHtml || bannerHtml) && <details className={styles.section}><summary>{t('planning_description')}</summary><div className={`${styles.content} ${styles.richText}`} onClick={handleHtmlClick} dangerouslySetInnerHTML={{ __html: bannerHtml + descriptionHtml }} /></details>}
        <div className={styles.calendar}>{children}</div>
        <footer className={styles.sources}>{t('planning_sources')}: {(event._mergedSources || [event.source]).filter(Boolean).join(' · ')}{event.updatedAt && <> · {t('planning_updated')} {new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(event.updatedAt))}</>}</footer>
    </div>;
}
