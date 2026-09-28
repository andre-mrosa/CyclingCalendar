import AdminLayoutClient from './AdminLayoutClient';
export const metadata = { robots: { index: false, follow: false } };
export default function Layout({ children }) { return <AdminLayoutClient>{children}</AdminLayoutClient>; }
