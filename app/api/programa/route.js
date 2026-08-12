import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            // Reduce timeout since this runs on demand
            signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch: ${response.status}` }, { status: 502 });
        }

        const buffer = await response.arrayBuffer();
        let html = new TextDecoder('utf-8').decode(buffer);
        if (html.includes('')) {
            html = new TextDecoder('iso-8859-1').decode(buffer);
        }
        const $ = cheerio.load(html);
        
        let programaHtml = '';
        let additionalLinks = [];

        // Strategy for Cabreira Solutions
        if (targetUrl.includes('cabreirasolutions')) {
            // Find an h2/h3 that contains "Programa"
            let found = false;
            $('h2, h3, h4, .elementor-heading-title').each((i, el) => {
                if (found) return;
                const text = $(el).text().toLowerCase();
                if (text.includes('programa')) {
                    found = true;
                    // Usually the schedule is in the next sibling elements, or a table nearby
                    const parent = $(el).parent();
                    
                    // Cabreira usually uses Elementor, so we might need to look at the next widget
                    const widget = $(el).closest('.elementor-widget');
                    if (widget.length) {
                        let nextWidget = widget.next();
                        while (nextWidget.length && nextWidget.find('h2, h3, h4').length === 0) {
                            programaHtml += nextWidget.html() + '<br/>';
                            nextWidget = nextWidget.next();
                        }
                    } else {
                        // generic fallback
                        let next = $(el).next();
                        while (next.length && !['H2', 'H3', 'H4'].includes(next[0].tagName)) {
                            programaHtml += next.html() + '<br/>';
                            next = next.next();
                        }
                    }
                }
            });
            
            // Fallback for Cabreira: look for any table if "Programa" heading isn't found
            if (!programaHtml) {
                const tables = $('table');
                if (tables.length > 0) {
                    programaHtml = $.html(tables.first());
                }
            }
            
            // Extract Cabreira links
            $('a').each((i, el) => {
                const text = $(el).text().trim().toLowerCase();
                let href = $(el).attr('href');
                if (!href || href === '#' || href.includes('cabreirasolutions.com/evento/')) return;
                
                if (!href.startsWith('http')) {
                    try {
                        href = new URL(href, targetUrl).toString();
                    } catch (e) {
                        href = 'https://cabreirasolutions.com' + (href.startsWith('/') ? href : '/' + href);
                    }
                }
                
                if (text.includes('inscreve') || text.includes('inscriç') || href.includes('inscricao')) {
                    if (!additionalLinks.some(l => l.label === 'Inscrever (Cabreira)')) additionalLinks.push({ label: 'Inscrever (Cabreira)', link: href });
                } else if (text.includes('classifica') || text.includes('resultado')) {
                    if (!additionalLinks.some(l => l.label === 'Resultados (Cabreira)')) additionalLinks.push({ label: 'Resultados (Cabreira)', link: href });
                } else if (text.includes('regulamento')) {
                    if (!additionalLinks.some(l => l.label === 'Regulamento')) additionalLinks.push({ label: 'Regulamento', link: href });
                }
            });
        }
        
        // Strategy for FPC
        else if (targetUrl.includes('fpciclismo')) {
            // FPC usually has a simple structure
            let found = false;
            $('strong, b, h2, h3').each((i, el) => {
                if (found) return;
                const text = $(el).text().toLowerCase();
                if (text.includes('programa')) {
                    found = true;
                    let next = $(el).parent().next(); // usually it's <p><strong>Programa</strong></p> <p>...</p>
                    while (next.length && next.find('strong, b').length === 0) {
                        programaHtml += next.html() + '<br/>';
                        next = next.next();
                    }
                    
                    // if that failed, just grab the whole parent text
                    if (!programaHtml) {
                        programaHtml = $(el).parent().text().replace('Programa', '').trim();
                    }
                }
            });
            
            if (!programaHtml) {
                // If FPC has tables, usually the second or third table has the program
                const tables = $('table');
                if (tables.length > 1) {
                    programaHtml = $.html(tables.eq(1)); // First table is usually general info
                } else if (tables.length === 1) {
                    programaHtml = $.html(tables.first());
                }
            }
            
            // Extract FPC links (usually they are big buttons or specific a tags)
            $('a').each((i, el) => {
                const text = $(el).text().trim().toLowerCase();
                const title = $(el).attr('title')?.toLowerCase() || '';
                let href = $(el).attr('href');
                if (!href || href === '#' || href === 'www.fpciclismo.pt') return;
                
                if (!href.startsWith('http')) {
                    try {
                        href = new URL(href, targetUrl).toString();
                    } catch (e) {
                        href = 'https://www.fpciclismo.pt' + (href.startsWith('/') ? href : '/' + href);
                    }
                }
                
                if (text.includes('inscreve') || title.includes('inscrever') || href.includes('inscrever')) {
                    if (!additionalLinks.some(l => l.label === 'Inscrever (FPC)')) additionalLinks.push({ label: 'Inscrever (FPC)', link: href });
                } else if (text.includes('classifica') || title.includes('classific') || href.includes('classificacao') || text.includes('resultado')) {
                    if (!additionalLinks.some(l => l.label === 'Resultados (FPC)')) additionalLinks.push({ label: 'Resultados (FPC)', link: href });
                } else if (text.includes('regulamento') || title.includes('regulamento') || href.includes('regulamento')) {
                    if (!additionalLinks.some(l => l.label === 'Regulamento')) additionalLinks.push({ label: 'Regulamento', link: href });
                }
            });
        }

        // Clean up the extracted HTML a bit to avoid massive payloads
        if (programaHtml) {
            // Strip out scripts and styles just in case
            const $clean = cheerio.load(programaHtml);
            $clean('script, style').remove();
            
            // Convert tables to vertical lists for better mobile display
            $clean('table').each((i, table) => {
                const $t = $clean(table);
                const headers = [];
                $t.find('th').each((j, th) => {
                    // Extract text, replacing <br> with space if any, or just get text
                    headers.push($clean(th).text().replace(/\s+/g, ' ').trim());
                });
                
                const $newList = $clean('<div class="vertical-programa-list"></div>');
                
                $t.find('tr').each((j, tr) => {
                    // Skip header row
                    if ($clean(tr).find('th').length > 0) return;
                    
                    const $item = $clean('<div class="programa-item"></div>');
                    let hasData = false;
                    
                    $clean(tr).find('td').each((k, td) => {
                        const val = $clean(td).html().trim();
                        // Ignore empty cells or placeholder dashes
                        if (val && val !== '-' && val !== '&nbsp;' && $clean(td).text().trim() !== '') {
                            hasData = true;
                            const label = headers[k] || '';
                            $item.append(`<div class="programa-row"><span class="programa-label">${label}</span><span class="programa-val">${val}</span></div>`);
                        }
                    });
                    
                    if (hasData) $newList.append($item);
                });
                
                if ($newList.children().length > 0) {
                    $t.replaceWith($newList);
                } else {
                    // Fallback if conversion failed or no data
                    $t.addClass('extracted-table');
                    $t.removeAttr('style').removeAttr('width').removeAttr('height').removeAttr('border');
                    $t.find('td, th, tr, tbody, thead').removeAttr('style').removeAttr('width').removeAttr('height');
                    $t.wrap('<div class="table-responsive"></div>');
                }
            });
            
            programaHtml = $clean.html();
        }

        return NextResponse.json({ 
            success: true, 
            programa: programaHtml ? programaHtml.trim() : null,
            additionalLinks: additionalLinks
        });

    } catch (error) {
        console.error('Error extracting programa:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
