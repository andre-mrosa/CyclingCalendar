// Runs before framework/authentication scripts, so recovery does not depend on
// React, Clerk or a working connection. Never reload automatically in a loop.
export const bootRecovery = `(()=>{
var timer=setTimeout(function(){
 if(!document.body)return;
 var panel=document.createElement('aside');panel.id='cycling-boot-recovery';panel.setAttribute('role','alert');
 panel.style.cssText='position:fixed;inset:auto 16px 24px;z-index:2147483647;max-width:480px;margin:auto;padding:20px;border:1px solid #666;border-radius:12px;background:#17191d;color:#fff;font:16px system-ui;box-shadow:0 4px 28px #0006';
 var title=document.createElement('strong');title.textContent='A app está a demorar a iniciar';
 var text=document.createElement('p');text.textContent='Podes consultar a cópia guardada neste dispositivo ou tentar novamente.';
 var offline=document.createElement('a');offline.href='/offline.html';offline.textContent='Consultar offline';offline.style.cssText='color:#8ee1b5;margin-right:20px';
 var retry=document.createElement('a');retry.href=location.href;retry.textContent='Tentar novamente';retry.style.color='#fff';
 panel.append(title,text,offline,retry);document.body.append(panel);
},12000);
window.addEventListener('cycling-app-ready',function(){clearTimeout(timer);document.getElementById('cycling-boot-recovery')?.remove();},{once:true});
})();`;
