import { isStageRace, getEventDiscipline, getEventRaceTypes, getEventDisciplineFamilies, getRaceTypeFamily, isOfficialNationalChampionship } from './eventClassifier.js';

export function normalizeSearchString(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

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
        selectedDisciplines,
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
        const normalizedQuery = normalizeSearchString(searchTerm);
        const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
        
        if (tokens.length > 0) {
            filtered = filtered.filter(event => {
                const effectiveTag = getEventDiscipline(event);
                const titleNorm = normalizeSearchString(event.title);
                const detailsNorm = normalizeSearchString(event.details);
                const distritoNorm = normalizeSearchString(event.distrito);
                const regiaoNorm = normalizeSearchString(event.regiao);
                const organizadorNorm = normalizeSearchString(event.organizador);
                const tagNorm = normalizeSearchString(event.tag) + ' ' + normalizeSearchString(effectiveTag);
                const sourceNorm = normalizeSearchString(event.source);
                const descNorm = normalizeSearchString(event.description);
                const dateNorm = normalizeSearchString(event.date);

                return tokens.every(token => {
                    const fieldMatch = titleNorm.includes(token) ||
                        detailsNorm.includes(token) ||
                        distritoNorm.includes(token) ||
                        regiaoNorm.includes(token) ||
                        organizadorNorm.includes(token) ||
                        tagNorm.includes(token) ||
                        sourceNorm.includes(token) ||
                        descNorm.includes(token) ||
                        dateNorm.includes(token);

                    if (fieldMatch) return true;

                    const translationMatch = event.translations?.some(t => 
                        normalizeSearchString(t.title).includes(token) || 
                        normalizeSearchString(t.details).includes(token) ||
                        normalizeSearchString(t.description).includes(token)
                    );

                    return Boolean(translationMatch);
                });
            });
        }
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
        filtered = filtered.filter(event => selectedAmbito === 'Campeonato Nacional'
            ? isOfficialNationalChampionship(event)
            : event.ambito === selectedAmbito);
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

    if (selectedDisciplines && selectedDisciplines.length > 0) {
        filtered = filtered.filter(event => {
            const families = getEventDisciplineFamilies(event);
            const raceTypes = getEventRaceTypes(event);
            return selectedDisciplines.some(discipline => {
                if (!families.includes(discipline)) return false;
                const selectedSpecialities = (selectedTags || []).filter(tag => getRaceTypeFamily(tag) === discipline);
                return selectedSpecialities.length === 0 || selectedSpecialities.some(tag => raceTypes.includes(tag));
            });
        });
    } else if (selectedTags && selectedTags.length > 0) {
        filtered = filtered.filter(event => {
            const effectiveTag = getEventDiscipline(event);
            const raceTypes = getEventRaceTypes(event);
            return selectedTags.some(tag => raceTypes.includes(tag)) || selectedTags.includes(effectiveTag) || selectedTags.includes(event.tag);
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
