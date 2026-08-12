const fs = require('fs');
const path = 'app/globals.css';
let css = fs.readFileSync(path, 'utf8');

// Fix modal-btn flex
css = css.replace(/flex: 1;/g, 'flex: 0 1 auto;\n    min-width: 150px;');

fs.writeFileSync(path, css);
console.log('CSS buttons updated successfully.');
