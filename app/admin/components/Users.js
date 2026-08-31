import { Search, Shield } from 'lucide-react';
import { Button, Empty, Notice, Panel, RefreshButton, Status, dateTime, number } from './ui';
import styles from '../admin.module.css';

export default function Users({ users, total, busy, search, setSearch, roleFilter, setRoleFilter, pending, refresh, onRole, onDelete }) {
    return <div className={styles.stack}>
        <div className={styles.sectionHeading}><div><h2>Utilizadores</h2><p>Contas, permissões e pedidos de eliminação.</p></div><RefreshButton busy={busy} onClick={refresh} /></div>
        {pending > 0 && <Notice><span>{number(pending)} pedido(s) de eliminação aguardam revisão.</span><Button onClick={() => setRoleFilter('deletions')}>Ver pedidos</Button></Notice>}
        <div className={styles.toolbar}><label className={styles.search}><Search size={17} /><input aria-label="Pesquisar utilizadores por nome ou email" placeholder="Pesquisar nome ou email…" value={search} onChange={event => setSearch(event.target.value)} /></label><label className={styles.inlineField}>Mostrar<select value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="ALL">Todos os utilizadores</option><option value="admin">Administradores</option><option value="user">Utilizadores</option><option value="deletions">Pedidos de eliminação</option></select></label></div>
        <Panel title={`${number(users.length)} de ${number(total)} utilizadores`} description="Contas Master estão protegidas contra alterações.">
            {busy && !users.length ? <Empty busy /> : !users.length ? <Empty>Nenhum utilizador corresponde aos filtros.</Empty> : <div className={styles.userList}>{users.map(user => {
                const admin = user.isMaster || user.role === 'admin';
                return <article key={user.id} className={styles.userRow}>
                    <div className={styles.userIdentity}><span className={styles.avatar} aria-hidden="true">{(user.fullName || user.email || 'U').slice(0, 2).toUpperCase()}</span><div><h4>{user.fullName || 'Sem nome'}</h4><p>{user.email}</p><details className={styles.userId}><summary>ID da conta</summary><code>{user.id}</code></details></div></div>
                    <div className={styles.userDates}><Status value={admin ? 'success' : 'idle'}>{user.isMaster ? 'Master' : admin ? 'Administrador' : 'Utilizador'}</Status><small>Adesão: {dateTime(user.createdAt)}</small><small>Último acesso: {dateTime(user.lastSignInAt)}</small></div>
                    {!user.isMaster && <div className={styles.userActions}><Button onClick={() => onRole(user, admin ? 'user' : 'admin')}><Shield size={14} />{admin ? 'Remover cargo admin' : 'Tornar administrador'}</Button>{!user.deletionRequested && <><Button onClick={() => onDelete(user, 'delete_data')}>Limpar dados</Button><Button tone="danger" onClick={() => onDelete(user, 'delete_account')}>Eliminar conta</Button></>}</div>}
                    {user.deletionRequested && <div className={styles.deletionRequest}><div><strong>{user.deletionType === 'DELETE_DATA' ? 'Pedido de limpeza de dados' : 'Pedido de eliminação da conta'}</strong>{user.deletionReason && <p>{user.deletionReason}</p>}</div>{!user.isMaster && <Button tone="danger" onClick={() => onDelete(user, user.deletionType === 'DELETE_DATA' ? 'delete_data' : 'delete_account')}>Rever e confirmar pedido</Button>}</div>}
                </article>;
            })}</div>}
        </Panel>
    </div>;
}
