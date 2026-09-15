import Image from 'next/image';
export default function DynamicLogo({ className = 'w-8 h-8' }) {
    return <Image src="/brand-final.png" width={64} height={64} className={`shrink-0 ${className}`} alt="" aria-hidden="true" />;
}
