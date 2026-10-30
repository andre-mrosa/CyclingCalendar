import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {filterEvents} from '../app/utils/filterEvents.js';
import {isStageRace,getEventCategories} from '../app/utils/eventClassifier.js';
import {suggestEscalao} from '../app/utils/suggestEscalao.js';
import {translateTag,translateEscalao} from '../app/i18n/formatters.js';
import {getAmbito} from '../app/lib/scrapers/utils.js';
import {toMinimalScrapedEvent} from '../app/lib/merging/eventMerger.js';
import {readStopAndGoListing} from '../app/lib/scrapers/stopandgoListing.js';
import {validateCalendarTranslations} from '../app/lib/validateCalendarTranslations.js';
import {legalCopy} from '../app/i18n/legalCopy.js';
test('open category aliases and serialized categories remain visible under age filters',()=>{
    const event={escaloes:'["Geral / Aberto"]'};
    assert.deepEqual(getEventCategories(event),['Todos (Aberto)']);
    assert.equal(filterEvents([event],{selectedEscaloes:['Sub-17 (Cadetes)']}).length,1);
    assert.equal(filterEvents([event],{selectedEscaloes:['Profissional (UCI)']}).length,0);
});
test('month filtering includes cross-month and cross-year races in each affected month',()=>{
    const race={date:'31 JUL 2026 a 02 AGO 2026',sortDate:'2026-07-31'};
    assert.equal(filterEvents([race],{monthFrom:8,monthTo:8}).length,1);
    assert.equal(filterEvents([race],{monthFrom:9,monthTo:9}).length,0);
    const year={date:'31 DEZ 2026 a 02 JAN 2027',sortDate:'2026-12-31'};
    assert.equal(filterEvents([year],{monthFrom:1,monthTo:1}).length,1);
    assert.equal(filterEvents([year],{monthFrom:12,monthTo:2}).length,1);
});
test('regional cycling cups and world cups do not become Portuguese Cups',()=>{
    assert.equal(getAmbito('Taça Regional de XCM','', 'BTT XCM'),'Regional');
    assert.equal(getAmbito('Taça do Minho XCO','', 'BTT XCO'),'Regional');
    assert.equal(getAmbito('Taça Oeste XCM 2027 - Batalha do Vimeiro'),'Regional');
    assert.equal(getAmbito('Taça de Portugal XCM - Oeste'),'Taça de Portugal');
    assert.equal(getAmbito('Taça de Portugal XCO - Minho'),'Taça de Portugal');
    assert.equal(getAmbito('Taça do Mundo BTT'),'Internacional');
});
test('a one-day GP is not a stage race and unconfirmed dates are not asserted as single-day races',()=>{
    const race={title:'Grande Prémio da Vila',date:'12 JUL 2026',sortDate:'2026-07-12'};
    assert.equal(isStageRace(race),false);
    assert.equal(filterEvents([race],{selectedType:'Um Dia'}).length,1);
    assert.equal(filterEvents([{title:'Data a confirmar'}],{selectedType:'Um Dia'}).length,0);
    assert.equal(isStageRace({...race,date:'12 JUL 2026 a 14 JUL 2026'}),true);
});
test('category suggestions use the chosen season and distinguish juveniles, youth, U23 and UCI riders',()=>{
    const base={season:2026,gender:'M',licenseType:'Competição',teamLevel:'Clube'};
    for(const[age,expected]of[[12,'Escolas'],[13,'Sub-15 (Juvenis)'],[14,'Sub-15 (Juvenis)'],[15,'Sub-17 (Cadetes)'],[18,'Sub-19 (Juniores)'],[22,'Sub-23'],[23,'Elite'],[35,'Masters / Veteranos']])
        assert.equal(suggestEscalao({...base,birthYear:2026-age}),expected);
    assert.equal(suggestEscalao({...base,birthYear:2012,season:2027}),'Sub-17 (Cadetes)');
    assert.equal(suggestEscalao({...base,birthYear:2004,teamLevel:'Individual'}),'Sub-23');
    assert.equal(suggestEscalao({...base,birthYear:1990,teamLevel:'Profissional'}),'Profissional (UCI)');
    assert.equal(suggestEscalao({...base,birthYear:1990,gender:'F',licenseType:'CPT'}),'Todos (Aberto)');
    assert.equal(suggestEscalao({...base,birthYear:2030}),null);
});
test('minimal persistence retains validated classifications and registration facts but rejects arbitrary metadata',()=>{
    const base={id:'race',title:'Prova XCO',date:'12 JUL 2026',sortDate:'2026-07-12',source:'FPC',link:'https://www.fpciclismo.pt/calendario'};
    const event=toMinimalScrapedEvent({...base,tag:'BTT XCO',ambito:'Regional',escaloes:['Sub-17 (Cadetes)','INVALID'],licenca:'Competição',description:'not public',registrationOpensAt:'2026-01-01'});
    assert.equal(event.tag,'BTT XCO');assert.equal(event.ambito,'Regional');assert.equal(event.escaloes,'["Sub-17 (Cadetes)"]');assert.ok(event.registrationOpensAt instanceof Date);
    assert.equal(event.description,undefined);
    const unknown=toMinimalScrapedEvent({...base,title:'Evento sem informação publicada',tag:'invented',ambito:'invented',escaloes:['invented'],licenca:'invented'});
    for(const field of ['tag','ambito','escaloes','licenca'])assert.equal(unknown[field],undefined);
});
test('cycling discovery uses the source modality even without a year in the URL',()=>{
    const card=(category,slug)=>`<a href="https://stopandgo.net/events/${slug}" data-ga4-event="select_item" data-ga4-params='${JSON.stringify({items:[{item_category2:category}]})}'>Bike Challenge</a>`;
    const listing=readStopAndGoListing('<select name="modality"><option value="2">BTT</option><option value="5">Trail</option></select>'+card('BTT','serra-norte')+card('Trail','bike-trail-2027'));
    assert.deepEqual(listing.modalities,['2']);assert.deepEqual(listing.urls,['https://stopandgo.net/events/serra-norte']);
});
test('the local language contract is complete and shared category/type labels are translated',()=>{
    assert.equal(validateCalendarTranslations().validatedLanguages,4);
    for(const lang of ['en','es','fr']){
        assert.notEqual(translateEscalao('Geral / Aberto',lang),'Geral / Aberto');
        assert.notEqual(translateTag('BTT XCM / Maratona',lang),'BTT XCM / Maratona');
        assert.notEqual(translateTag('Estrada CRI / ITT',lang),'Estrada CRI / ITT');
    }
});
test('granfondos with no published licence are discoverable in leisure without inventing one',()=>{
    const race={title:'Granfondo da Serra',tag:'Granfondo',date:'23 MAI 2027',licenca:null};
    assert.equal(filterEvents([race],{filterLeisure:true}).length,1);assert.equal(race.licenca,null);
    assert.equal(filterEvents([{...race,title:'Campeonato XCO',tag:'BTT XCO'}],{filterLeisure:true}).length,0);
});
test('legal pages have complete translations and preserve dates and retention periods',async()=>{
    const keys=Object.keys(legalCopy.en);
    for(const language of ['en','es','fr']){
        assert.deepEqual(Object.keys(legalCopy[language]),keys);
        for(const [original,translated]of Object.entries(legalCopy[language])){
            assert.ok(translated.trim());assert.equal(translated.includes('\uFFFD'),false);
            assert.deepEqual(original.match(/\b\d+\b/g),translated.match(/\b\d+\b/g));
        }
    }
    for (const path of ['../app/privacy-policy/PrivacyPolicyClient.js','../app/terms-of-service/TermsOfServiceClient.js']) {
        const source = await readFile(new URL(path, import.meta.url), 'utf8');
        for (const [, literal] of source.matchAll(/\bl\(("(?:[^"\\]|\\.)*")\)/gu)) {
            const text = JSON.parse(literal);
            for (const language of ['en','es','fr']) assert.ok(legalCopy[language][text], `${language}: missing legal translation: ${text}`);
        }
    }
});
