const fs = require('fs');
const path = 'app/globals.css';
let css = fs.readFileSync(path, 'utf8');

const newCSS = `
.event-list-item {
    display: grid;
    grid-template-columns: 140px minmax(300px, 1fr) 200px 300px;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.event-list-date {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--primary-color);
    background: rgba(0, 123, 255, 0.1);
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-md);
    text-align: center;
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.event-list-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.event-list-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    line-height: 1.3;
}

.event-list-details {
    display: flex;
    gap: 1rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.event-list-detail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.event-list-location {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.event-list-meta {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
}

@media (max-width: 1024px) {
    .event-list-item {
        grid-template-columns: 120px 1fr 150px 200px;
        gap: 1rem;
    }
}

@media (max-width: 768px) {
    .event-list-item {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }
    .event-list-date {
        align-self: flex-start;
        flex-direction: row;
        gap: 0.5rem;
    }
    .event-list-meta {
        justify-content: flex-start;
        width: 100%;
    }
}
`;

// Remove old list item rules
css = css.replace(/\.event-list-item\s*{[\s\S]*?}(?=\s*\.event-list-item:hover)/, '');
css = css.replace(/\.event-list-main\s*{[\s\S]*?}(?=\s*\.event-list-date)/, '');
css = css.replace(/\.event-list-date\s*{[\s\S]*?}(?=\s*\.event-list-info)/, '');
css = css.replace(/\.event-list-info\s*{[\s\S]*?}(?=\s*\.event-list-title)/, '');
css = css.replace(/\.event-list-title\s*{[\s\S]*?}(?=\s*\.event-list-details)/, '');
css = css.replace(/\.event-list-details\s*{[\s\S]*?}(?=\s*\.event-list-detail-item)/, '');
css = css.replace(/\.event-list-detail-item\s*{[\s\S]*?}(?=\s*\.event-list-location)/, '');
css = css.replace(/\.event-list-location\s*{[\s\S]*?}(?=\s*\.event-list-meta)/, '');
css = css.replace(/\.event-list-meta\s*{[\s\S]*?}(?=\s*\.event-list-tag)/, '');

css += '\n' + newCSS;

fs.writeFileSync(path, css);
console.log('CSS updated successfully for table grid layout.');
