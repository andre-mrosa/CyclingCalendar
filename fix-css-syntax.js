const fs = require('fs');
const path = 'app/globals.css';
let css = fs.readFileSync(path, 'utf8');

// Replace the buggy block around line 198 with the correct .no-scrollbar CSS
css = css.replace(/}\s*\.no-scrollbar::-webkit-scrollbar {/g, `
/* Utility for hiding scrollbars but keeping scroll functionality */
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {`);

fs.writeFileSync(path, css);
console.log('Fixed syntax error in globals.css.');
