import Link from 'next/link';
import { ArrowLeft, RouteOff } from 'lucide-react';
import styles from './components/site.module.css';

export default function NotFound() {
    return (
        <div className={styles.page}>
            <section className={styles.empty}>
                <div className={styles.emptyIcon}><RouteOff size={32} /></div>
                <div className={styles.heading}>
                    <div className={styles.eyebrow}>404 · Cycling Calendar</div>
                    <h1>Fora do percurso.</h1>
                    <p>Esta página não existe. O calendário está à tua espera para encontrares a próxima prova.</p>
                </div>
                <Link href="/" className={styles.primaryButton}><ArrowLeft size={16} />Voltar ao calendário</Link>
            </section>
        </div>
    );
}
