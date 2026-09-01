import { AlertTriangle, Wind, CloudRain, CloudSun, Flame, Snowflake, Bike, Sun, Info } from 'lucide-react';

// Translate legacy/cached weather decorations at the presentation boundary only.
const adviceIcons = [
    ['\u26A0\uFE0F', AlertTriangle], ['\uD83D\uDCA8', Wind], ['\uD83C\uDF27\uFE0F', CloudRain], ['\u26C5', CloudSun],
    ['\uD83D\uDD25', Flame], ['\u2744\uFE0F', Snowflake], ['\uD83D\uDEB4\u200D\u2642\uFE0F', Bike], ['\u2600\uFE0F', Sun],
];

const adviceRules = [
    [/vento muito forte|rajadas/i, AlertTriangle],
    [/vento/i, Wind],
    [/chuva/i, CloudRain],
    [/aguaceiros/i, CloudSun],
    [/temperatura muito elevada|hidratação/i, Flame],
    [/frio|roupa térmica/i, Snowflake],
    [/perfeitas para pedalar/i, Bike],
    [/favoráveis/i, Sun],
];

export default function WeatherAdvice({ text }) {
    const value = String(text);
    const match = adviceIcons.find(([prefix]) => value.startsWith(prefix));
    const cleanValue = match ? value.slice(match[0].length).trimStart() : value;
    const rule = adviceRules.find(([pattern]) => pattern.test(cleanValue));
    const Icon = match?.[1] || rule?.[1] || Info;
    return (
        <span className="inline-flex items-start gap-2">
            <Icon size={13} className="shrink-0 mt-0.5 text-muted" aria-hidden="true" />
            <span>{cleanValue}</span>
        </span>
    );
}
