export default function DynamicLogo({ className = 'w-8 h-8' }) {
    return <img src="/brand-final.png?v=1.0.0-3" width="64" height="64" className={`shrink-0 ${className}`} alt="" aria-hidden="true" />;
}
