import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Bike } from 'lucide-react';

// Same bicycle as the site header, with its name in a square composition.
export function brandSVG() {
    const bicycle = renderToStaticMarkup(React.createElement(Bike, {
        width: 184, height: 184, strokeWidth: 1.5, color: '#35634e',
    }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" fill="#ffffff"/><g transform="translate(164 72)">${bicycle}</g><g fill="#17191d" font-family="Arial, sans-serif" font-weight="600" text-anchor="middle"><text x="256" y="322" font-size="58">Cycling</text><text x="256" y="384" font-size="58">Calendar</text></g></svg>\n`;
}
