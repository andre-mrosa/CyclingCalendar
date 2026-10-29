export function suggestEscalao({ birthYear, season, gender, licenseType, teamLevel }) {
    const age = Number(season) - Number(birthYear);
    if (!/^\d{4}$/.test(String(birthYear)) || !Number.isInteger(age) || age < 5 || age > 100) return null;
    if (licenseType === 'CPT') return 'Todos (Aberto)';
    if (gender === 'F') return 'Femininas';
    if (age <= 12) return 'Escolas';
    if (age <= 14) return 'Sub-15 (Juvenis)';
    if (age <= 16) return 'Sub-17 (Cadetes)';
    if (age <= 18) return 'Sub-19 (Juniores)';
    if (teamLevel === 'Profissional') return 'Profissional (UCI)';
    if (age <= 22) return 'Sub-23';
    if (age >= 30) return 'Masters / Veteranos';
    return teamLevel === 'Individual' ? 'Elite Amador' : 'Elite';
}
