import { PUBLIC_PAGES, pageMetadata } from '../lib/seo';
export const metadata = pageMetadata(...PUBLIC_PAGES.find(page => page[0] === '/nacionais'));
export default function Layout({ children }) { return children; }
