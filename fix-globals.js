const fs = require('fs');
const content = fs.readFileSync('app/globals.css', 'utf8');

const correctHead = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
    /* Color Palette - Premium Dark Mode */
    --bg-color: #0f172a;
    --bg-secondary: #1e293b;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    
    --accent-primary: #3b82f6;
    --accent-secondary: #60a5fa;
    --accent-gradient: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    
    --card-bg: rgba(30, 41, 59, 0.7);
    --card-border: rgba(255, 255, 255, 0.05);
    
    --shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15);
    --shadow-glow: 0 0 20px rgba(59, 130, 246, 0.3);
    
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-full: 9999px;
    
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:root.light-mode {
    --bg-color: #f8fafc;
    --bg-secondary: #f1f5f9;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    
    --accent-primary: #2563eb;
    --accent-secondary: #3b82f6;
    --accent-gradient: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
    
    --card-bg: rgba(255, 255, 255, 0.7);
    --card-border: rgba(0, 0, 0, 0.1);
    
    --shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    height: 100%;
}

body {
    font-family: 'Inter', sans-serif;
    background-color: var(--bg-color);
    color: var(--text-primary);
    line-height: 1.5;
    min-height: 100%;
    background-image: 
        radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.15) 0px, transparent 50%);
    background-attachment: fixed;
    overflow-x: hidden;
}

::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}
::-webkit-scrollbar-track {
    background: transparent;
}
::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
}

.app-container {
    max-width: 1300px;
    margin: 0 auto;
    padding: 1.5rem;
}

.pagination-container {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    width: 100%;
    align-items: center;
    margin-top: 1.5rem;
    padding-bottom: 1rem;
    gap: 1rem;
}

@media (max-width: 768px) {
    .pagination-container {
        display: flex;
        flex-direction: column-reverse;
        justify-content: center;
    }
}

/* Header */
.app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--card-border);
    flex-wrap: wrap;
    gap: 1rem;
}

.header-content h1 {`;

const splitIndex = content.indexOf('.header-content h1 {');
if (splitIndex !== -1) {
    const after = content.substring(splitIndex + '.header-content h1 {'.length);
    fs.writeFileSync('app/globals.css', correctHead + after);
    console.log("Success");
} else {
    console.log("Failed to find anchor");
}
