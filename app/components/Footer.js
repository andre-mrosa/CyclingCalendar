import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{
      textAlign: 'center',
      padding: '2rem',
      color: 'var(--text-secondary)',
      fontSize: '0.85rem',
      borderTop: '1px solid var(--card-border)',
      marginTop: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/privacidade" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Política de Privacidade
        </Link>
        <span>•</span>
        <Link href="/termos" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Termos de Serviço
        </Link>
        <span>•</span>
        <Link href="/contacto" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Contactos
        </Link>
      </div>
      <p style={{ margin: 0 }}>
        © {new Date().getFullYear()} Cycling Calendar. Não afiliado com a FPC.
      </p>
    </footer>
  );
}
