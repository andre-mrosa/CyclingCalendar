export function filterEvents(events, filters) {
    let filtered = events;
    const {
        filterByFavorites, favorites,
        searchTerm,
        selectedEscalao,
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

    if (selectedEscalao && selectedEscalao !== 'Todos') {
        if (selectedEscalao === 'Elite Amador / Individual') {
            filtered = filtered.filter(event => {
                const e = event.escalao;
                if (e === 'Profissional (UCI)' || e === 'Sub-19 (Juniores)' || e === 'Sub-17 (Cadetes)' || e === 'Sub-15 (Juvenis)' || e === 'Escolas' || e === 'Femininas' || e === 'Masters / Veteranos') {
                    return false;
                }
                
                return (
                    e === 'Todos (Aberto)' || 
                    e === 'Geral / Vários' ||
                    e === 'Elite / Sub-23' ||
                    e === 'Elite Amador / Individual' ||
                    event.details.toLowerCase().includes('granfondo') ||
                    event.title.toLowerCase().includes('granfondo')
                );
            });
        } else {
            filtered = filtered.filter(event => {
                const detLow = event.details.toLowerCase();
                const titleLow = event.title.toLowerCase();
                
                // UCI races are exclusive. If they selected UCI, ONLY show UCI races. 
                // Do not show "Todos (Aberto)" or "Geral" because UCI races are never open.
                if (selectedEscalao === 'Profissional (UCI)') {
                    return event.escalao === 'Profissional (UCI)' || detLow.match(/\b[12]\.(1|pro|hc)\b/) || titleLow.includes('volta a portugal') || titleLow.includes('volta ao algarve');
                }
                
                // For other categories (like Sub-23, Masters), they can participate in Open events, 
                // so we include 'Todos (Aberto)' and 'Geral / Vários'
                if (event.escalao === 'Todos (Aberto)' || event.escalao === 'Geral / Vários') return true;
                if (event.escalao === selectedEscalao) return true;
                
                if (selectedEscalao === 'Elite / Sub-23') {
                    return detLow.includes('.12') || detLow.includes('.13') || titleLow.includes('elite') || titleLow.includes('sub-23') || titleLow.includes('sub23');
                }
                if (selectedEscalao === 'Sub-23') {
                    return detLow.includes('.13') || titleLow.includes('sub-23') || titleLow.includes('sub23');
                }
                if (selectedEscalao === 'Sub-19 (Juniores)') {
                    return detLow.includes('.14') || titleLow.includes('sub-19') || titleLow.includes('sub19') || titleLow.includes('juniores');
                }
                if (selectedEscalao === 'Sub-17 (Cadetes)') {
                    return detLow.includes('.15') || titleLow.includes('sub-17') || titleLow.includes('sub17') || titleLow.includes('cadetes');
                }
                if (selectedEscalao === 'Sub-15 (Juvenis)') {
                    return detLow.includes('.16') || titleLow.includes('sub-15') || titleLow.includes('sub15') || titleLow.includes('juvenis');
                }
                if (selectedEscalao === 'Masters / Veteranos') {
                    return detLow.includes('.17') || titleLow.includes('master') || titleLow.includes('veteranos');
                }
                if (selectedEscalao === 'Femininas') {
                    return detLow.includes('.18') || titleLow.includes('feminin');
                }
                if (selectedEscalao === 'Escolas') {
                    return detLow.includes('escolas') || titleLow.includes('escolas');
                }
                return false;
            });
        }
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
