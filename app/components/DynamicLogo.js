import { Bike } from 'lucide-react';

export default function DynamicLogo({ className = 'w-8 h-8' }) {
    return <Bike className={`shrink-0 text-brand ${className}`} strokeWidth={1.5} aria-hidden="true" />;
}
