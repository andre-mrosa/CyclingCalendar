import { PUBLIC_PAGES, pageMetadata } from '../lib/seo';
import PrivacyPolicyClient from './PrivacyPolicyClient';
export const metadata = pageMetadata(...PUBLIC_PAGES.find(page => page[0] === '/privacy-policy'));
export default function Page() { return <PrivacyPolicyClient />; }
