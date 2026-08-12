const fs = require('fs');
const path = 'app/components/CalendarView.js';
let content = fs.readFileSync(path, 'utf8');

const newPagination = `
                        <div className="pagination-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 0', gap: '2rem' }}>
                            <button 
                                className="modal-btn" 
                                style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: 'none', padding: '0.75rem 1.5rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                                Anterior
                            </button>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
                                <span>Página</span>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max={Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage))}
                                    value={currentPage}
                                    onChange={(e) => {
                                        let p = parseInt(e.target.value);
                                        const m = Math.ceil(filteredEvents.length / itemsPerPage);
                                        if (p >= 1 && p <= m) {
                                            setCurrentPage(p);
                                        }
                                    }}
                                    style={{ width: '60px', padding: '0.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                />
                                <span>de {Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage))}</span>
                            </div>
                            
                            <button 
                                className="modal-btn" 
                                style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: 'none', padding: '0.75rem 1.5rem', cursor: currentPage >= Math.ceil(filteredEvents.length / itemsPerPage) ? 'not-allowed' : 'pointer', opacity: currentPage >= Math.ceil(filteredEvents.length / itemsPerPage) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredEvents.length / itemsPerPage), p + 1))}
                                disabled={currentPage >= Math.ceil(filteredEvents.length / itemsPerPage)}
                            >
                                Próxima
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            </button>
                        </div>
`;

const startIndex = content.indexOf('<div className="pagination-container">');
if (startIndex !== -1) {
    const endIndexStr = '                        </div>\n                    </>\n                )}';
    let endIndex = content.indexOf(endIndexStr, startIndex);
    
    // If exact block not found, try to locate </>\n                )}
    if (endIndex === -1) {
        endIndex = content.indexOf('</>\n                )}', startIndex);
        if (endIndex !== -1) {
            const before = content.substring(0, startIndex);
            const after = content.substring(endIndex);
            content = before + newPagination + '                    ' + after;
            fs.writeFileSync(path, content);
            console.log("Pagination replaced successfully!");
        } else {
            console.log("Could not find the closing tag.");
        }
    } else {
        const before = content.substring(0, startIndex);
        const after = content.substring(endIndex + endIndexStr.length);
        content = before + newPagination + '                    </>\n                )}\n' + after;
        fs.writeFileSync(path, content);
        console.log("Pagination replaced successfully!");
    }
} else {
    console.log("Could not find pagination-container.");
}
