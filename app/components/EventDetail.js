'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowLeft, ArrowUpRight, ArrowRight, CalendarDays, CalendarCheck, Info, MapPin, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { interfaceText } from '../i18n/interfaceCopy';
import { myEventsText } from '../i18n/myEventsCopy';
import { translateAmbito, translateLicenca, translateTag } from '../i18n/formatters';
import { useMyEvents } from '../hooks/useMyEvents';
import { useStoredString } from '../hooks/useBrowserState';
import { calendarReturnPath } from '../utils/calendarInterface';
import { eventPath, DISCIPLINES, REGIONS } from '../lib/eventDiscovery';
import { originalEventUrl } from '../lib/publicEvent';
import { eventDateDisplay } from '../utils/eventDateDisplay';
import { formatEventTitle, formatCalendarDateRange } from '../utils/calendarPresentation';
import { formatEventLocation, cleanLocation, normalizeLocation } from '../utils/eventLocation';
import { isStageRace, getEventDiscipline } from '../utils/eventClassifier';
import EventParticipation from './EventParticipation';
import GoogleCalendarAction from './GoogleCalendarAction';
import EventTrust from './EventTrust';
import RegistrationBadge from './RegistrationBadge';
import {monthLabel} from '../utils/partialDates';
import styles from './site.module.css';

export default function EventDetail({ event, related = [] }) {
    const { language, t } = useTranslation();
    const ui = key => interfaceText(language, key);
    const personalText = key => myEventsText(language, key);
    const collectionEvents = useMemo(() => [event], [event]);
    const collection = useMyEvents(collectionEvents);
    const storedReturn = useStoredString('cycling_calendar_return', '/');
    const back = calendarReturnPath(storedReturn);
    const dates = eventDateDisplay(event);
    const location = formatEventLocation(event);
    const sourceLink = originalEventUrl(event.link);
    const sourceHost = sourceLink ? new URL(sourceLink).hostname.replace(/^www\./, '') : '';
    const inCalendar = collection.isMarked(event.id, 'event', event._allIds || []);
    const status = collection.statusFor(event);
    const discipline = getEventDiscipline(event);
    const format = isStageRace(event) ? ui('stages') : dates.singleDay ? t('filter_single_day') : dates.start ? ui('multiDay') : ui('unknownDate');
    const fields = [
        [ui('discipline'), discipline ? translateTag(discipline, language) : event.tag],
        [ui('format'), format],
        [ui('scope'), event.ambito && translateAmbito(event.ambito, language)],
        [ui('locationLabel'), location],
        [ui('licence'), event.licenca && translateLicenca(event.licenca, language)],
        [ui('regional'), normalizeLocation(event.regiao) !== normalizeLocation(location) && cleanLocation(event.regiao)],
    ].filter(([, value]) => value);
    const verified = event.lastVerifiedAt ? new Date(event.lastVerifiedAt) : null;
    return <article className={`${styles.page} ${styles.detailPage}`}>
        <Link prefetch={false} href={back} className={styles.backLink}><ArrowLeft size={14} aria-hidden="true" />{ui(/^\/(minhas-provas|favoritos|agenda)(\?|$)/.test(back) ? 'backPersonal' : 'back')}</Link>
        <header className={styles.detailHeading}>
            <p className={styles.eyebrow}>{discipline && translateTag(discipline, language)}{event.ambito && <> · {translateAmbito(event.ambito, language)}</>}</p>
            <h1>{formatEventTitle(event.title)}</h1>
            <div className={styles.detailMeta}><span><CalendarDays size={17} aria-hidden="true" />{dates.precision==='month'?`— ${monthLabel(dates.key,language)} · ${ui('unknownDate')}`:dates.start ? <time dateTime={dates.start}>{formatCalendarDateRange(dates.start, dates.end, language)}</time> : ui('unknownDate')}</span>{location && <span><MapPin size={17} aria-hidden="true" />{location}</span>}</div>
        </header>
        <div className={styles.detailLayout}>
            <div className={styles.detailContent}>
                <dl className={styles.detailFacts}>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                <section className={styles.detailSection}><h2>{ui('aboutEvent')}</h2><p>{ui('sourceFacts')}</p>
                    <div className={styles.detailNotice}><Info size={18} aria-hidden="true" /><p><strong>{ui('confirmBefore')}</strong><br />{ui('sourceWarning')}</p></div>
                    <div className={styles.detailSource}><ShieldCheck size={14} aria-hidden="true" /><span>{ui('source')}: {event.source}{verified && Number.isFinite(verified.getTime()) && <> · {ui('checked')}: {new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'Europe/Lisbon' }).format(verified)}</>}</span></div>
                </section>
                <EventTrust event={event} />
                {related.length > 0 && <section className={styles.detailSection}><h2>{ui('related')}</h2>{related.map(other => {
                    const start = eventDateDisplay(other).start;
                    return <Link prefetch={false} href={eventPath(other)} className={styles.relatedEvent} key={other.id}><span><strong>{Number(start.slice(8))}</strong>{new Intl.DateTimeFormat(language, { month: 'short', timeZone: 'UTC' }).format(new Date(start + 'T12:00:00Z'))}</span><div><h3>{formatEventTitle(other.title)}</h3><p>{formatEventLocation(other)} · {translateTag(getEventDiscipline(other), language)}</p></div><ArrowRight size={16} aria-hidden="true" /></Link>;
                })}</section>}
                <nav className={styles.detailExplore} aria-label={ui('explore')}>
                    {DISCIPLINES.filter(item => item.match(event)).map(item => <Link key={item.slug} href={'/modalidades/' + item.slug}>{ui('explore')} · {translateTag(discipline, language)}<ArrowUpRight size={13} aria-hidden="true" /></Link>)}
                    {REGIONS.filter(item => item.match(event)).map(item => <Link key={item.slug} href={'/regioes/' + item.slug}>{ui('explore')} · {item.name}<ArrowUpRight size={13} aria-hidden="true" /></Link>)}
                </nav>
                <Link href={'/organizador?event=' + encodeURIComponent(event.id)} className={styles.correctionLink}>{ui('correction')}<ArrowUpRight size={14} aria-hidden="true" /></Link>
            </div>
            <aside className={styles.detailActions} aria-label={personalText('status')}>
                <h2>{ui('nextStart')}</h2><p>{ui('sourceIntro')}</p>
                {sourceLink && <><a href={sourceLink} target="_blank" rel="noopener noreferrer" className={styles.primaryButton}>{ui('sourceAction')}<ArrowUpRight size={16} aria-hidden="true" /></a><small>{ui('organiserSite')} · {sourceHost}</small></>}
                <hr />
                <RegistrationBadge event={event} />
                {status && <p className={styles.detailStateLabel}>{ui('yourStatus')}</p>}
                <EventParticipation event={event} collection={collection} />
                {status && <p className={styles.detailStateHint}>{ui('stateHint')}</p>}
                <div className={styles.detailGoogle}><span data-active={inCalendar}><CalendarCheck size={17} aria-hidden="true" />{inCalendar ? personalText('google') : 'Google Calendar'}</span><GoogleCalendarAction event={event} inCalendar={inCalendar} collection={collection} /></div>
                {collection.personalError && <p role="alert" className={styles.detailStateHint}>{personalText('loadError')} <button type="button" onClick={collection.refreshPersonal}>{t('btn_try_again')}</button></p>}
            </aside>
        </div>
    </article>;
}
