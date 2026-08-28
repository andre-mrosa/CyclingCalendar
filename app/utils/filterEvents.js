import { isStageRace, getEventDiscipline } from './eventClassifier';

export function filterEvents(events, filters) {
    let filtered = events;
    const {
        filterByFavorites, favorites,
        filterByAgenda, markedSet,
        searchTerm,
        selectedYears,
        selectedEscaloes,
        selectedAmbito,
        selectedLicenca,
        selectedRegiao,
        selectedDistrito,
        monthFrom,
        monthTo,
        selectedTags,
        selectedType
    } = filters;

    if (selectedYears && selectedYears.length > 0 && !filterByFavorites && !filterByAgenda) {
        filtered = filtered.filter(event => {
            const y = event.sortDate ? new Date(event.sortDate).getFullYear().toString() : null;
            return selectedYears.some(selYear => (y && y === selYear) || (event.date && event.date.includes(selYear)));
        });
    }

    if (filterByFavorites && favorites) {
        filtered = filtered.filter(event => 
            favorites.includes(event.id) || (event._allIds && event._allIds.some(id => favorites.includes(id)))
        );
    }

    if (filterByAgenda && markedSet) {
        filtered = filtered.filter(event => 
            markedSet.has(String(event.id)) || (event._allIds && event._allIds.some(id => markedSet.has(String(id))))
        );
    }
    
    if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(event => {
            const effectiveTag = getEventDiscipline(event);
            const titleMatch = event.title?.toLowerCase().includes(term);
            const detailsMatch = event.details?.toLowerCase().includes(term);
            const distritoMatch = event.distrito?.toLowerCase().includes(term);
            const regiaoMatch = event.regiao?.toLowerCase().includes(term);
            const organizadorMatch = event.organizador?.toLowerCase().includes(term);
            const tagMatch = (event.tag?.toLowerCase().includes(term)) || (effectiveTag.toLowerCase().includes(term));
            const sourceMatch = event.source?.toLowerCase().includes(term);
            const translationMatch = event.translations?.some(t => 
                t.title?.toLowerCase().includes(term) || 
                t.details?.toLowerCase().includes(term)
            );
            return titleMatch || detailsMatch || distritoMatch || regiaoMatch || organizadorMatch || tagMatch || sourceMatch || translationMatch;
        });
    }

    if (selectedEscaloes && selectedEscaloes.length > 0) {
        filtered = filtered.filter(event => {
            const evEscaloes = event.escaloes || [];
            
            // Se o único escalão selecionado for Profissional UCI, apenas mostrar eventos UCI
            if (selectedEscaloes.length === 1 && selectedEscaloes[0] === 'Profissional (UCI)') {
                return evEscaloes.includes('Profissional (UCI)');
            }
            
            // Verificar interseção normal (excluindo Elite Amador)
            const standardEscaloes = selectedEscaloes.filter(e => e !== 'Elite Amador');
            let hasIntersection = standardEscaloes.some(esc => evEscaloes.includes(esc));
            
            // Regra especial para Elite Amador
            if (selectedEscaloes.includes('Elite Amador')) {
                const isElite = evEscaloes.includes('Elite');
                const isUCI = evEscaloes.includes('Profissional (UCI)');
                
                if (isElite && !isUCI) {
                    hasIntersection = true;
                }
            }
            
            if (hasIntersection) return true;
            
            // Se o utilizador procura algo amador e o evento é 'Todos (Aberto)' ou 'Geral'
            const isOpenEvent = evEscaloes.includes('Todos (Aberto)') || evEscaloes.includes('Geral / Vários');
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
            const dateStr = (event.date || '').toUpperCase();
            for (const [mStr, mNum] of Object.entries(monthMap)) {
                if (dateStr.includes(mStr)) {
                    return mNum >= monthFrom && mNum <= monthTo;
                }
            }
            return true;
        });
    }

    if (selectedTags && selectedTags.length > 0) {
        filtered = filtered.filter(event => {
            const effectiveTag = getEventDiscipline(event);
            return selectedTags.includes(effectiveTag) || selectedTags.includes(event.tag);
        });
    }

    if (selectedType && selectedType !== 'Todos') {
        filtered = filtered.filter(event => {
            const isStage = isStageRace(event);
            if (selectedType === 'Etapas') {
                return isStage;
            } else if (selectedType === 'Um Dia') {
                return !isStage;
            }
            return true;
        });
    }

    return filtered;
}
