export default function Loading() {
    return <section className="mx-auto max-w-xl px-6 py-16" role="status" aria-live="polite">
        <h1 className="text-xl font-semibold">A carregar o calendário…</h1>
        <p className="mt-3 text-muted">Se a ligação estiver lenta, podes consultar a cópia guardada neste dispositivo.</p>
        <a className="mt-5 inline-block text-brand underline" href="/offline.html">Consultar offline</a>
    </section>;
}
