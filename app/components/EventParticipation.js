'use client';
import { useState } from 'react';
import { Bookmark, BookmarkCheck, LoaderCircle } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { myEventsText } from '../i18n/myEventsCopy';
import { experienceText } from '../i18n/experienceCopy';
import { interfaceText } from '../i18n/interfaceCopy';
import styles from './favoritePlanning.module.css';
export default function EventParticipation({ event, collection }) {
    const { language } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const tr = key => myEventsText(language, key);
    const status = collection.statusFor(event) || '';
    async function change(next) {
        setBusy(true); setFailed(false);
        try { await collection.setStatus(event, next); } catch { setFailed(true); }
        finally { setBusy(false); }
    }
    return <span className={styles.participation} data-active={!!status} onClick={event => event.stopPropagation()}>
        {collection.isSignedIn && status ? <select className={styles.participationSelect} title={interfaceText(language, 'stateHint')}
            aria-label={tr('status') + ': ' + event.title} value={status} disabled={busy || !collection.canEdit}
            onChange={event => change(event.target.value)}>
            <option value="">{tr(status ? 'remove' : 'save')}</option>
            {['interested', 'going', 'registered'].map(value => <option key={value} value={value}>{tr(value)}</option>)}
        </select> : <button type="button" className={styles.participationSelect} aria-pressed={!!status}
            aria-label={tr(status ? 'remove' : 'save') + ': ' + event.title} disabled={busy || !collection.canEdit}
            onClick={() => change(status ? '' : 'interested')}>{status ? <BookmarkCheck size={15} /> : <Bookmark size={15} />} {tr(status ? 'interested' : 'save')}</button>}
        {busy && <LoaderCircle size={13} className={styles.participationSaving} aria-hidden="true" />}
        {failed && <span role="alert">{experienceText(language, 'error')}</span>}
    </span>;
}
