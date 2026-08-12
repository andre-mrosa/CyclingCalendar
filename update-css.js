const fs = require('fs');
const path = 'app/globals.css';
let css = fs.readFileSync(path, 'utf8');

// Increase modal max-width further
css = css.replace(/max-width: 950px;/, 'max-width: 1100px;');

// Change grid to explicitly be 1fr 1fr on desktop instead of auto-fit
css = css.replace(/grid-template-columns: repeat\(auto-fit, minmax\(300px, 1fr\)\);/, 'grid-template-columns: 1fr 1fr;');

// Add custom scrollbar styling for programa-content to make it sleek
const newCSS = `
.programa-content a {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 500;
}
.programa-content a:hover {
    text-decoration: underline;
}

.programa-content::-webkit-scrollbar {
    width: 6px;
}
.programa-content::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.05);
    border-radius: 10px;
}
.programa-content::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.2);
    border-radius: 10px;
}
.programa-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.3);
}

@media (max-width: 800px) {
    .modal-two-cols {
        grid-template-columns: 1fr !important;
    }
}
`;

if (!css.includes('.programa-content a {')) {
    css += '\n' + newCSS;
}

fs.writeFileSync(path, css);
console.log('CSS updated successfully for cleaner layout.');
