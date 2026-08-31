import { AlertTriangle, Wind, CloudRain, CloudSun, Flame, Snowflake, Bike, Sun, Info } from 'lucide-react';

// Translate legacy/cached weather decorations at the presentation boundary only.
const adviceIcons = [
    ['⚠️', AlertTriangle], ['💨', Wind], ['🌧️', CloudRain], ['⛅', CloudSun],
    ['🔥', Flame], ['❄️', Snowflake], ['🚴‍♂️', Bike], ['☀️', Sun],
];
export default function WeatherAdvice({ text }) {
    const value = String(text);
    const match = adviceIcons.find(([prefix]) => value.startsWith(prefix));
    const Icon = match?.[1] || Info;
    return (
        <span className="inline-flex items-start gap-2">
            <Icon size={13} className="shrink-0 mt-0.5 text-muted" aria-hidden="true" />
            <span>{match ? value.slice(match[0].length).trimStart() : value}</span>
        </span>
    );
}
