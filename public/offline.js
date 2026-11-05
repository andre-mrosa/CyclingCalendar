import { readOfflineCatalogue, readOfflinePersonal,readOfflineRegistrations, offlinePersonalFor, offlineFilter, offlineMonthShift, offlineOccursOn, offlineRoute } from './offline-model.js';
const $ = id => document.getElementById(id);
let settings = {}; try { settings = JSON.parse(localStorage.getItem('cycling-calendar-settings'))?.state || {}; } catch {}
const lang = ['pt','en','es','fr'].includes(settings.language) ? settings.language : (['pt','es','fr'].find(code => navigator.language.startsWith(code)) || 'en');
document.documentElement.lang = lang;
let theme; try { theme = localStorage.getItem('theme'); } catch {}
document.documentElement.classList.toggle('dark', theme === 'dark' || ((!theme || theme === 'system') && matchMedia('(prefers-color-scheme: dark)').matches));
const copy = {
 offline:['Modo offline','Offline mode','Modo sin conexión','Mode hors ligne'], title:['Sem ligação à internet','No internet connection','Sin conexión a internet','Sans connexion internet'], detail:['Podes consultar as provas guardadas neste dispositivo.','You can browse the events stored on this device.','Puedes consultar las pruebas guardadas en este dispositivo.','Vous pouvez consulter les épreuves enregistrées sur cet appareil.'], retry:['Tentar ligação','Retry connection','Reintentar conexión','Réessayer'], retryFailed:['Ainda sem ligação. A cópia guardada continua disponível.','Still unavailable. Your saved copy remains available.','Sigue sin conexión. La copia guardada sigue disponible.','Toujours indisponible. La copie enregistrée reste accessible.'], checking:['A verificar ligação…','Checking connection…','Comprobando conexión…','Vérification de la connexion…'], calendar:['Calendário','Calendar','Calendario','Calendrier'], personal:['As minhas provas','My events','Mis pruebas','Mes épreuves'], savedCopy:['Cópia neste dispositivo','Copy on this device','Copia en este dispositivo','Copie sur cet appareil'], search:['Pesquisar','Search','Buscar','Rechercher'], searchPlaceholder:['Prova ou localidade','Event or location','Prueba o localidad','Épreuve ou localité'], discipline:['Modalidade','Discipline','Modalidad','Discipline'], period:['Período','Period','Período','Période'], all:['Todas','All','Todas','Toutes'], upcoming:['Próximas','Upcoming','Próximas','À venir'], history:['Histórico','History','Historial','Historique'], allDates:['Todas as datas','All dates','Todas las fechas','Toutes les dates'], allPersonal:['Todas as provas','All my events','Todas mis pruebas','Toutes mes épreuves'], list:['Lista','List','Lista','Liste'], clear:['Limpar filtros','Clear filters','Limpiar filtros','Effacer les filtres'], events:['provas','events','pruebas','épreuves'], empty:['Sem provas nesta seleção.','No events match this selection.','No hay pruebas para esta selección.','Aucune épreuve pour cette sélection.'], noCopy:['Ainda não há uma cópia neste dispositivo. Abre o calendário com ligação para preparar a consulta offline.','No copy is available yet. Open the calendar with a connection to prepare offline access.','Todavía no hay una copia. Abre el calendario con conexión para preparar el acceso sin conexión.','Aucune copie disponible. Ouvrez le calendrier avec une connexion pour préparer l’accès hors ligne.'], unknown:['Data por confirmar','Date to be confirmed','Fecha por confirmar','Date à confirmer'], stage:['Por etapas','Stage race','Por etapas','Par étapes'], interested:['Interessado','Interested','Me interesa','Intéressé'], going:['Vou participar','Planning to attend','Voy a participar','Participation prévue'], registered:['Já inscrito','Registered','Ya inscrito','Déjà inscrit'], readNote:['A inscrição, as alterações de participação e o Google Calendar ficam disponíveis quando recuperares a ligação.','Registration, participation changes and Google Calendar are available when your connection returns.','Las inscripciones, los cambios de participación y Google Calendar estarán disponibles al recuperar la conexión.','Les inscriptions, modifications de participation et Google Calendar sont disponibles au retour de la connexion.'], unavailable:['Esta página precisa de ligação à internet.','This page needs an internet connection.','Esta página necesita conexión a internet.','Cette page nécessite une connexion internet.'], openCalendar:['Consultar calendário guardado','Browse saved calendar','Consultar calendario guardado','Consulter le calendrier enregistré'], nextMonth:['Ver outro mês com provas','See another month with events','Ver otro mes con pruebas','Voir un autre mois avec des épreuves'], previous:['Mês anterior','Previous month','Mes anterior','Mois précédent'], next:['Mês seguinte','Next month','Mes siguiente','Mois suivant'], close:['Fechar','Close','Cerrar','Fermer'], source:['Fonte','Source','Fuente','Source'], location:['Localização publicada','Published location','Ubicación publicada','Lieu publié'], scope:['Âmbito','Scope','Ámbito','Portée'], note:['Confirma datas, local de partida e condições na fonte quando estiveres online. O estado de participação é definido por ti e não confirma uma inscrição.','Confirm dates, start location and requirements at the source when online. Your participation status does not confirm a registration.','Confirma fechas, salida y condiciones en la fuente al recuperar la conexión. Tu estado no confirma una inscripción.','Confirmez les dates, le départ et les conditions à la source une fois en ligne. Votre statut ne confirme pas une inscription.']
};
const tr = key => copy[key]?.[['pt','en','es','fr'].indexOf(lang)] || key;
const node = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
const set = (id, key) => $(id).textContent = tr(key);
for (const [id,key] of Object.entries({'offline-label':'offline','connection-title':'title','connection-detail':'detail',retry:'retry','search-label':'search','discipline-label':'discipline','period-label':'period','all-personal':'allPersonal','list-view':'list','calendar-view':'calendar',clear:'clear','read-note':'readNote','unavailable-text':'unavailable','open-calendar':'openCalendar','discover-link':'calendar','personal-link':'personal'})) set(id,key);
$('search').placeholder = tr('searchPlaceholder'); $('previous').ariaLabel = tr('previous'); $('next').ariaLabel = tr('next'); $('close-dialog').ariaLabel = tr('close');
let storage; try { storage = localStorage; } catch { storage = { getItem: () => null }; }
const catalogue = readOfflineCatalogue(storage), personal = readOfflinePersonal(storage);
const savedRegistrations=readOfflineRegistrations(storage);
const pathname = location.pathname, personalOnly = /^\/(minhas-provas|favoritos|agenda)$/.test(pathname);
set('heading',personalOnly?'personal':'calendar'); $('collection').hidden = !personalOnly;
$('discover-link').setAttribute('aria-current',personalOnly?'false':'page'); $('personal-link').setAttribute('aria-current',personalOnly?'page':'false');
const stamp = new Date(catalogue.updatedAt); $('copy-date').textContent = Number.isFinite(stamp.getTime()) ? tr('savedCopy') + ': ' + new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short'}).format(stamp) : '';
$('reader').hidden = !offlineRoute(pathname); $('unavailable').hidden = offlineRoute(pathname);
for (const [i,key] of ['upcoming','history','allDates'].entries()) $('period').options[i].textContent = tr(key);
$('discipline').options[0].textContent = tr('all');
for (const type of [...new Set(catalogue.events.map(event=>event.discipline).filter(Boolean))].sort()) { const option=node('option',type); option.value=type; $('discipline').append(option); }
const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let month = '', day = '', view = 'list', googleOnly = false;
function filtered(extra={}) { return offlineFilter(catalogue.events,{query:$('search').value,discipline:$('discipline').value,personalOnly,googleOnly,period:$('period').value,today,pathname,...extra},personal); }
const registrationLabel=kind=>({pt:{open:'Abertura de inscrições',close:'Fecho de inscrições',title:'Inscrições no Google Calendar'},en:{open:'Registration opens',close:'Registration closes',title:'Registrations in Google Calendar'},es:{open:'Apertura de inscripciones',close:'Cierre de inscripciones',title:'Inscripciones en Google Calendar'},fr:{open:'Ouverture des inscriptions',close:'Clôture des inscriptions',title:'Inscriptions dans Google Calendar'}}[lang])[kind];
function registrationItems(){return !personalOnly?[]:savedRegistrations.filter(item=>{
 const source=catalogue.events.find(event=>event.id===item.eventId||event.aliases?.includes(item.eventId));
 const record={...(source||{}),id:item.id,title:item.title,start:item.day,end:item.day,month:''};
 return offlineFilter([record],{query:$('search').value,discipline:$('discipline').value,period:$('period').value,today}).length;
});}
function dateText(date, options={day:'numeric',month:'long',year:'numeric'}) { return new Intl.DateTimeFormat(lang,{...options,timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')); }
function range(event) { return event.start ? dateText(event.start)+(event.end&&event.end!==event.start?' – '+dateText(event.end):'') : event.month?'— '+dateText(event.month+'-01',{month:'long',year:'numeric'})+' · '+tr('unknown'):tr('unknown'); }
function details(event) {
 $('event-title').textContent=event.title; const facts=node('dl');
 for (const [label,value] of [[tr('calendar'),range(event)],[tr('location'),event.location],[tr('discipline'),event.discipline],[tr('scope'),event.scope],[tr('source'),event.source]]) if(value){const row=node('div');row.append(node('dt',label),node('dd',value));facts.append(row);}
 $('event-facts').replaceChildren(facts,node('p',tr('note'),'dialog-note')); $('event-dialog').showModal();
}
function renderRows(events) {
 const fragment=document.createDocumentFragment(),groups=new Map();
 for(const event of events){const key=(event.start||event.month)+'/'+event.end;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(event);}
 for(const group of groups.values()){
  const first=group[0],section=node('section',undefined,'day-group'),date=node('div',undefined,'date'),list=node('div');
  date.append(node('strong',first.start?String(Number(first.start.slice(8))):'—'),node('small',first.start?dateText(first.start,{weekday:'short'}):''));
  for(const event of group){const article=node('article',undefined,'event'),button=node('button',event.title);button.type='button';button.addEventListener('click',()=>details(event));
   const meta=node('div',undefined,'meta');for(const value of [event.location,event.discipline,event.month||event.end&&event.end!==event.start?range(event):''])if(value)meta.append(node('span',value));
   const badges=node('div',undefined,'badges'),saved=offlinePersonalFor(event,personal);
   if(event.stage)badges.append(node('span',tr('stage'),'stage'));if(saved)badges.append(node('span',tr(saved.status)));if(saved?.google)badges.append(node('span','Google Calendar'));if(event.scope)badges.append(node('span',event.scope));
   article.append(button,meta,badges);list.append(article);
  }section.append(date,list);fragment.append(section);
 }return fragment;
}
function render(){
 const registrations=registrationItems();
 const all=filtered(); if(!month)month=(all.find(event=>(event.start||event.month)&&(event.end||event.start||event.month+'-99')>=today)?.start||all.find(event=>event.month&&event.month>=today.slice(0,7))?.month||all.filter(event=>event.start).at(-1)?.start||today).slice(0,7);
 $('month-title').textContent=dateText(month+'-01',{month:'long',year:'numeric'});const current=filtered({month,day});$('counter').textContent=current.length+' '+tr('events');
 $('calendar').hidden=view!=='calendar';$('list-view').setAttribute('aria-pressed',view==='list');$('calendar-view').setAttribute('aria-pressed',view==='calendar');
 if(view==='calendar'){
  const weekdays=node('div',undefined,'weekdays'),days=node('div',undefined,'days');for(let i=0;i<7;i++)weekdays.append(node('div',dateText('2024-01-0'+(i+1),{weekday:'short'})));
  const first=new Date(month+'-01T12:00:00Z'),offset=(first.getUTCDay()+6)%7,count=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  for(let i=0;i<Math.ceil((offset+count)/7)*7;i++){const n=i-offset+1;if(n<1||n>count){days.append(node('span'));continue;}const iso=month+'-'+String(n).padStart(2,'0'),entries=all.filter(event=>offlineOccursOn(event,iso)),milestones=registrations.filter(item=>item.day===iso),button=node('button');button.type='button';button.append(node('span',String(n)));button.setAttribute('aria-label',dateText(iso)+' · '+entries.length+' '+tr('events')+milestones.map(item=>' · '+registrationLabel(item.kind)+': '+item.title).join(''));button.setAttribute('aria-pressed',day===iso);if(entries.length)button.append(node('small','• '+entries.length));if(milestones.length)button.append(node('small','◷ '+milestones.length));button.addEventListener('click',()=>{day=day===iso?'':iso;render();});days.append(button);}
  $('calendar').replaceChildren(weekdays,days);
  const monthly=current.filter(event=>event.month);if(!day&&monthly.length)$('calendar').append(node('h3','— '+tr('unknown')),renderRows(monthly));
  const visible=registrations.filter(item=>day?item.day===day:item.day.startsWith(month));
  if(visible.length){const section=node('section');section.append(node('h3',registrationLabel('title')));for(const item of visible){const row=node('p',registrationLabel(item.kind)+' · '+dateText(item.day)+(item.time?' · '+item.time:'')+' — '+item.title);section.append(row);}$('calendar').append(section);}
 }
 $('results').replaceChildren();
 if(view==='list'||day){if(day)$('results').append(node('p',dateText(day),'selected-day'));if(current.length)$('results').append(renderRows(current));else{
   const empty=node('div',catalogue.updatedAt?tr('empty'):tr('noCopy'),'empty'),other=all.find(event=>(event.start||event.month)&&(event.start||event.month).slice(0,7)!==month);
   if(other){const button=node('button',tr('nextMonth'));button.type='button';button.addEventListener('click',()=>{month=(other.start||other.month).slice(0,7);day='';render();});empty.append(node('br'),button);} $('results').append(empty);
 }}
}
for(const id of ['search','discipline','period'])$(id).addEventListener(id==='search'?'input':'change',()=>{month='';day='';render();});
for(const [id,delta] of [['previous',-1],['next',1]])$(id).addEventListener('click',()=>{month=offlineMonthShift(month,delta);day='';render();});
for(const [id,mode] of [['list-view','list'],['calendar-view','calendar']])$(id).addEventListener('click',()=>{view=mode;render();});
for(const [id,value] of [['all-personal',false],['google-only',true]])$(id).addEventListener('click',()=>{googleOnly=value;month='';day='';$('all-personal').setAttribute('aria-pressed',!value);$('google-only').setAttribute('aria-pressed',value);render();});
$('clear').addEventListener('click',()=>{$('search').value='';$('discipline').value='';$('period').value='future';month='';day='';render();});$('close-dialog').addEventListener('click',()=>$('event-dialog').close());
if(pathname.startsWith('/provas/')){const event=catalogue.events.find(event=>event.path===pathname);if(event)details(event);}
render();
let reconnecting=false,checking=false;
async function reconnect(manual=false){
 if(checking||reconnecting||navigator.onLine===false||document.visibilityState==='hidden'||$('event-dialog').open&&!manual)return;
 checking=true;if(manual)$('connection-detail').textContent=tr('checking');
 const target=['/offline.html','/~offline'].includes(pathname)?'/':location.pathname+location.search;
 try{
  const version=await fetch('/api/app-version',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!version.ok)throw Error();
  const value=await version.json();if(typeof value.version!=='string'||!/^[a-zA-Z0-9._-]{1,100}$/.test(value.version))throw Error();
  const response=await fetch(target,{method:'HEAD',cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))throw Error();
  try { const previous=Number(sessionStorage.getItem('cycling_offline_resume')||0);if(!manual&&Date.now()-previous<30000)return;sessionStorage.setItem('cycling_offline_resume',String(Date.now())); } catch { if(!manual)return; }
  reconnecting=true;location.replace(target);
 }catch{if(manual)$('connection-detail').textContent=tr('retryFailed');}finally{checking=false;}
}
$('retry').addEventListener('click',()=>reconnect(true));for(const event of ['online','focus','pageshow'])window.addEventListener(event,()=>reconnect());document.addEventListener('visibilitychange',()=>reconnect());setInterval(()=>reconnect(),15000);void reconnect();
