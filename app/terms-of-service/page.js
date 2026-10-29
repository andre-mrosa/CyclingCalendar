import { PUBLIC_PAGES, pageMetadata } from '../lib/seo';
import TermsOfServiceClient from './TermsOfServiceClient';
export const metadata = pageMetadata(...PUBLIC_PAGES.find(page => page[0] === '/terms-of-service'));
export default function Page() { return <TermsOfServiceClient />; }
