const fs = require('fs');
const path = 'app/globals.css';
let css = fs.readFileSync(path, 'utf8');

// I will just find the exact block and slice it out, or use regex to remove the duplicate grid blocks at the end of the file.
// Let's just find the first occurrence of `.event-list-item {` after the `.modal-btn` styles (which is around line 311).
// Wait, the grid stuff starts at the end of the file because I appended it there!
// Looking at the view_file output, the duplicate blocks start around line 550. Let's just find the last `@media (max-width: 1024px)` that contains `grid-template-columns` and remove it, along with everything around it.
// Actually, it's safer to just rewrite globals.css without the appended block.
// The appended block starts with `.event-list-item {\n    display: grid;`

const gridIndex = css.lastIndexOf('.event-list-item {\n    display: grid;');
if (gridIndex > 0) {
    // Cut the string right before the grid CSS
    css = css.substring(0, gridIndex);
    fs.writeFileSync(path, css.trim() + '\n');
    console.log('Removed duplicate grid CSS.');
} else {
    // maybe spacing is different
    const gridIndex2 = css.lastIndexOf('grid-template-columns: 140px minmax(300px, 1fr) 200px 300px;');
    if (gridIndex2 > 0) {
        // find the start of the rule
        const ruleStart = css.lastIndexOf('.event-list-item {', gridIndex2);
        css = css.substring(0, ruleStart);
        fs.writeFileSync(path, css.trim() + '\n');
        console.log('Removed duplicate grid CSS based on grid-template-columns.');
    } else {
        console.log('Could not find duplicate grid CSS to remove.');
    }
}
