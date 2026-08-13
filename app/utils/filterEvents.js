export function filterEvents(events, filters) {
    let filtered = events;
    const {
        filterByFavorites, favorites,
        searchTerm,
        selectedEscaloes,
        selectedAmbito,
        selectedLicenca,
        selectedRegiao,
        selectedDistrito,
        monthFrom,
        monthTo,
        selectedTags
    } = filters;

    if (filterByFavorites && favorites) {
        filtered = filtered.filter(event => favorites.includes(event.id));
    }
    
    if (searchTerm) {
        filtered = filtered.filter(event => 
            event.title.toLowerCase().includes(searchTerm) ||
            event.details.toLowerCase().includes(searchTerm)
        );
    }

    if (selectedEscaloes && selectedEscaloes.length > 0) {
        filtered = filtered.filter(event => {
            const evEscaloes = event.escaloes || [];
            const ambito = event.ambito;
            
            // Se o único escalão selecionado for Profissional UCI, apenas mostrar eventos UCI
            if (selectedEscaloes.length === 1 && selectedEscaloes[0] === 'Profissional (UCI)') {
                return evEscaloes.includes('Profissional (UCI)');
            }
            
            // Verificar interseção normal (excluindo Elite Amador)
            const standardEscaloes = selectedEscaloes.filter(e => e !== 'Elite Amador');
            let hasIntersection = standardEscaloes.some(esc => evEscaloes.includes(esc));
            
            // Regra especial para Elite Amador
            if (selectedEscaloes.includes('Elite Amador')) {
                // Elite Amador pode ir a provas Elite (incluindo Taças e Nacionais)
                // DESDE QUE a prova não seja estritamente Profissional (UCI)
                const isElite = evEscaloes.includes('Elite');
                const isUCI = evEscaloes.includes('Profissional (UCI)');
                
                if (isElite && !isUCI) {
                    hasIntersection = true;
                }
            }
            
            if (hasIntersection) return true;
            
            // Se o utilizador procura algo amador e o evento é 'Todos (Aberto)' ou 'Geral'
            const isOpenEvent = evEscaloes.includes('Todos (Aberto)') || evEscaloes.includes('Geral / Vários');
            
            // Se o utilizador selecionou apenas UCI, não cai no isOpenEvent porque já foi tratado acima.
            return isOpenEvent;
        });
    }

    if (selectedAmbito && selectedAmbito !== 'Todos') {
        filtered = filtered.filter(event => event.ambito === selectedAmbito);
    }

    if (selectedLicenca && selectedLicenca !== 'Todas') {
        filtered = filtered.filter(event => event.licenca === selectedLicenca);
    }

    if (selectedRegiao && selectedRegiao !== 'Todas') {
        filtered = filtered.filter(event => event.regiao === selectedRegiao);
    }
    
    if (selectedDistrito && selectedDistrito !== 'Todos') {
        filtered = filtered.filter(event => event.distrito === selectedDistrito);
    }

    if (monthFrom !== undefined && monthTo !== undefined) {
        const monthMap = {'JAN':1, 'FEV':2, 'MAR':3, 'ABR':4, 'MAI':5, 'JUN':6, 'JUL':7, 'AGO':8, 'SET':9, 'OUT':10, 'NOV':11, 'DEZ':12};
        
        filtered = filtered.filter(event => {
            const dateStr = event.date.toUpperCase();
            for (const [mStr, mNum] of Object.entries(monthMap)) {
                if (dateStr.includes(mStr)) {
                    return mNum >= monthFrom && mNum <= monthTo;
                }
            }
            return true;
        });
    }

    if (selectedTags && selectedTags.length > 0) {
        filtered = filtered.filter(event => selectedTags.includes(event.tag));
    }

    return filtered;
}
