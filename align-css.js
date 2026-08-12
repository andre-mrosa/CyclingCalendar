const fs = require('fs');
const path = 'app/globals.css';
let css = fs.readFileSync(path, 'utf8');

// We will overwrite the event-list Flexbox rules to force exact widths and stop scrolling
const fixedCSS = `
.event-list-item {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    width: 100%;
    box-sizing: border-box;
}

.event-list-main {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex: 1;
    min-width: 0; /* Prevents flex blowout causing scroll */
}

.event-list-date {
    flex: 0 0 130px;
    font-weight: 700;
    color: var(--primary-color);
    font-size: 0.9rem;
    white-space: normal;
    background: rgba(0, 123, 255, 0.1);
    padding: 0.5rem;
    border-radius: var(--radius-md);
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.event-list-info {
    flex: 1;
    min-width: 0;
}

.event-list-title {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.event-list-details {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    color: var(--text-secondary);
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.event-list-detail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
}

.event-list-location {
    flex: 0 0 160px;
    color: var(--text-primary);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.event-list-meta {
    flex: 0 0 260px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
}

.event-list-tag {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-secondary);
    padding: 0.25rem 0.6rem;
    border-radius: 20px;
    font-size: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    white-space: nowrap;
}

.logo-fpc, .logo-cabreira {
    height: 25px;
    width: auto;
    object-fit: contain;
    flex-shrink: 0;
}

@media (max-width: 1024px) {
    .event-list-main {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
    }
    .event-list-date, .event-list-location {
        flex: 1 1 auto;
        text-align: left;
        align-items: flex-start;
    }
}

@media (max-width: 768px) {
    .event-list-item {
        flex-direction: column;
        align-items: flex-start;
    }
    .event-list-meta {
        flex: 1 1 auto;
        width: 100%;
        justify-content: flex-start;
        margin-top: 0.5rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--card-border);
        flex-wrap: wrap;
    }
}
`;

// Replace the old blocks with the new fixedCSS
css = css.replace(/\.event-list-item\s*{[\s\S]*?(?=\/\* Programa Modal Styles \*\/)/, fixedCSS + '\n\n');

fs.writeFileSync(path, css);
console.log('Fixed alignment and scrolling issues.');
