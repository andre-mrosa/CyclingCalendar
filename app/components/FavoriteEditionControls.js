'use client';
import Link from 'next/link';
import { useTranslation } from '../i18n/useTranslation';
import styles from './favoritePlanning.module.css';
const copy = {
    pt: { title: 'Próximas edições dos favoritos', follow: 'Adicionar novas edições aos favoritos', detail: 'Aplica-se a todas as provas guardadas. As edições identificadas com segurança aparecem automaticamente. Se desligares, as já adicionadas mantêm-se.',
        email: 'Avisar por email quando aparecer uma nova edição', explain: 'Resumo apenas com novidades, no máximo uma vez por dia. As edições que já existem quando ativas o aviso não geram emails.',
        setup: 'Os avisos por email ainda precisam de configuração do remetente.', login: 'Inicia sessão para sincronizar esta opção e ativar avisos por email.', error: 'Não foi possível guardar ou carregar estas opções. Tenta novamente.', verified: 'É necessário verificar o email principal da conta.' },
    en: { title: 'Future editions of your favorites', follow: 'Add new editions to favorites', detail: 'Applies to all saved events. Confidently matched editions appear automatically. Turning this off keeps editions already added.',
        email: 'Email me when a new edition appears', explain: 'Updates only, at most once a day. Editions already available when you enable this do not trigger emails.',
        setup: 'Email alerts still need a configured sender.', login: 'Sign in to sync this setting and enable email alerts.', error: 'Could not save or load these settings. Try again.', verified: 'Verify the primary email address on your account first.' },
    es: { title: 'Próximas ediciones de tus favoritos', follow: 'Añadir nuevas ediciones a favoritos', detail: 'Se aplica a todas las pruebas guardadas. Las ediciones identificadas con suficiente confianza aparecen automáticamente. Al desactivarlo, se conservan las ya añadidas.',
        email: 'Avisarme por email cuando aparezca otra edición', explain: 'Solo novedades, como máximo una vez al día. Las ediciones ya disponibles al activarlo no generan emails.',
        setup: 'Los avisos necesitan configurar el remitente.', login: 'Inicia sesión para sincronizar esta opción y activar avisos por email.', error: 'No se pudieron guardar o cargar estas opciones.', verified: 'Verifica el email principal de tu cuenta.' },
    fr: { title: 'Prochaines éditions de vos favoris', follow: 'Ajouter les nouvelles éditions aux favoris', detail: 'Pour toutes les épreuves enregistrées. Les éditions associées avec suffisamment de certitude apparaissent automatiquement. La désactivation conserve celles déjà ajoutées.',
        email: 'Me prévenir par email pour une nouvelle édition', explain: 'Uniquement des nouveautés, au maximum une fois par jour. Les éditions déjà disponibles lors de l’activation ne déclenchent pas d’email.',
        setup: 'Les alertes nécessitent encore la configuration de l’expéditeur.', login: 'Connectez-vous pour synchroniser ce choix et activer les emails.', error: 'Impossible de charger ou enregistrer ces options.', verified: 'Vérifiez l’adresse principale de votre compte.' },
};
export default function FavoriteEditionControls({ preferences, isSignedIn }) {
    const { language } = useTranslation();
    const text = copy[language] || copy.pt;
    const { follow, email, available, busy, error, update } = preferences;
    return <section className={styles.panel} aria-labelledby="favorite-editions-heading">
        <h2 id="favorite-editions-heading">{text.title}</h2>
        <label className="flex gap-3 items-start my-4 cursor-pointer"><input className="mt-1 h-4 w-4 accent-brand shrink-0" type="checkbox" role="switch" checked={follow} disabled={busy}
            onChange={event => update(event.target.checked, event.target.checked && email, language)} /><span><strong>{text.follow}</strong><span className="block text-sm text-muted mt-1">{text.detail}</span></span></label>
        <label className="flex gap-3 items-start my-4"><input className="mt-1 h-4 w-4 accent-brand shrink-0" type="checkbox" role="switch" checked={email} disabled={busy || !follow || !isSignedIn || !available}
            onChange={event => update(follow, event.target.checked, language)} /><span><strong>{text.email}</strong><span className="block text-sm text-muted mt-1">{text.explain}</span></span></label>
        {!isSignedIn && <Link href="/sign-in?redirect_url=%2Ffavoritos" className="text-brand text-sm">{text.login}</Link>}
        {isSignedIn && !available && <p className="text-sm text-muted">{text.setup}</p>}
        {error && <p role="status">{error === 'Verified email required' ? text.verified : text.error}</p>}
    </section>;
}
