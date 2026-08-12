const fs = require('fs');
const path = 'app/globals.css';
let css = fs.readFileSync(path, 'utf8');

const originalCSS = `
.event-list-item {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.event-list-main {
    display: flex;
    align-items: center;
    gap: 2rem;
    flex: 1;
}

.event-list-date {
    font-weight: 700;
    color: var(--primary-color);
    font-size: 0.95rem;
    white-space: nowrap;
    background: rgba(0, 123, 255, 0.1);
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
}

.event-list-info {
    flex: 1;
}

.event-list-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.event-list-details {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.event-list-detail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.event-list-location {
    color: var(--text-primary);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.event-list-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.event-list-tag {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-secondary);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-fpc, .logo-cabreira {
    height: 30px;
    width: auto;
    object-fit: contain;
}

@media (max-width: 1024px) {
    .event-list-main {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
    }
}
@media (max-width: 768px) {
    .event-list-item {
        flex-direction: column;
        align-items: flex-start;
    }
    .event-list-meta {
        width: 100%;
        justify-content: space-between;
        margin-top: 0.5rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--card-border);
        flex-wrap: wrap;
    }
}
`;

// Regex out the new grid CSS we added at the bottom
css = css.replace(/\.event-list-item\s*{[\s\S]*?(?=\/\*)/, originalCSS + '\n\n');

fs.writeFileSync(path, css);
console.log('Restored old Flexbox layout in globals.css.');
