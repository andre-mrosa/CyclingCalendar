import test from 'node:test';
import assert from 'node:assert/strict';
import {formatRegistrationDay} from '../app/utils/registrationDates.js';
import {autoAddToGoogleCalendar,buildIcsContent,generateGoogleCalendarUrl} from '../app/utils/calendarExport.js';
const race={id:'fixture',title:'Prova',date:'23 MAI 2027',registrationClosesAt:'2027-05-18T23:59:00.000Z'};

test('registration deadlines preserve the published day in Lisbon summer and other browser time zones',t=>{
    const before=process.env.TZ;t.after(()=>{if(before===undefined)delete process.env.TZ;else process.env.TZ=before;});
    for(const zone of ['UTC','Europe/Lisbon','America/New_York']){process.env.TZ=zone;assert.match(formatRegistrationDay(race.registrationClosesAt,'en'),/May 18/);}
    assert.match(buildIcsContent(race),/DTSTART;TZID=Europe\/Lisbon:20270518T235900/);
    const url=new URL(generateGoogleCalendarUrl(race,'reg_close'));
    assert.equal(url.searchParams.get('dates'),'20270518T235900/20270519T005900');assert.equal(url.searchParams.get('ctz'),'Europe/Lisbon');
});
function browser(t){
    const alerts=[],navigations=[],events=[];
    const before=globalThis.window;
    globalThis.window={open:()=>null,alert:text=>alerts.push(text),dispatchEvent:event=>events.push(event.type),location:{assign:url=>navigations.push(url)}};
    t.after(()=>{if(before===undefined)delete globalThis.window;else globalThis.window=before;});
    return {alerts,navigations,events};
}
test('blocked popups do not break a successful existing-calendar addition',async t=>{
    const b=browser(t);t.mock.method(globalThis,'fetch',async()=>Response.json({success:true,message:'exists'}));
    assert.equal(await autoAddToGoogleCalendar(race,'race',generateGoogleCalendarUrl(race)),true);
    assert.equal(b.events[0],'cycling-calendar-updated');assert.match(b.alerts[0],/já está/);assert.equal(b.navigations.length,0);
});
test('missing dates never call OAuth or open a broken calendar page',async t=>{
    const b=browser(t);t.mock.method(globalThis,'fetch',()=>assert.fail('Unexpected export'));
    assert.equal(await autoAddToGoogleCalendar({id:'bad'},'race',null),false);assert.equal(b.navigations.length,0);assert.match(b.alerts[0],/Confirma/);
});
test('Google web fallback remains usable when the popup is blocked',async t=>{
    const b=browser(t);t.mock.method(globalThis,'fetch',async()=>Response.json({error:'No token'},{status:403}));
    const url=generateGoogleCalendarUrl(race);assert.equal(await autoAddToGoogleCalendar(race,'race',url),false);assert.deepEqual(b.navigations,[url]);
});
