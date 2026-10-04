const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('js/analytics.js','utf8');
function harness({host='davidzlchen.com',choice='',search='',privateSignal=false,blockedStorage=false,path='/pokemon-sleep/'}={}){
 const buttons=['granted','denied'].map(value=>({dataset:{analyticsChoice:value},addEventListener(_,fn){this.click=fn},setAttribute(){}}));
 const scripts=[],status={},listeners={};let cookie='_ga=old';
 const document={readyState:'complete',title:'Field Notes',referrer:'https://example.com/private?secret=account',querySelectorAll:q=>q==='[data-analytics-status]'?[status]:buttons,
 createElement:()=>({}),head:{append:s=>scripts.push(s)},addEventListener:(name,fn)=>listeners[name]=fn,get cookie(){return cookie},set cookie(v){cookie=v}};
 const ctx=vm.createContext({document,location:{hostname:host,origin:'https://'+host,pathname:path,search,hash:'#pokemon-private'},navigator:{globalPrivacyControl:privateSignal},URL,URLSearchParams,
 localStorage:{getItem(){if(blockedStorage)throw Error();return choice},setItem(_,v){if(blockedStorage)throw Error();choice=v}}});
 ctx.addEventListener=(_,fn)=>ctx.storageListener=fn;ctx.window=ctx;vm.runInContext(source,ctx);
 return {ctx,scripts,status,buttons,listeners,get choice(){return choice}};
}
const h=harness({search:'?pokemon=private-id&snapshot=private-date'});
assert.equal(h.scripts.length,0);h.ctx.SiteAnalytics.track('field_notes_use',{action:'search'});assert.equal(h.ctx.dataLayer,undefined);
h.buttons[0].click();assert.equal(h.scripts.length,1);
const config=h.ctx.dataLayer.find(a=>a[0]==='config')[2];assert.equal(config.page_location,'https://davidzlchen.com/pokemon-sleep/');assert.equal(config.page_referrer,'https://example.com');assert.equal(config.allow_google_signals,false);
h.ctx.SiteAnalytics.track('field_notes_use',{action:'search',nickname:'secret',account:'private',query:'private'});
assert.deepEqual(JSON.parse(JSON.stringify(h.ctx.dataLayer.at(-1)[2])),{action:'search'});
const count=h.ctx.dataLayer.length;h.ctx.SiteAnalytics.track('field_notes_use',{action:'private'});h.ctx.SiteAnalytics.track('bad');assert.equal(h.ctx.dataLayer.length,count);
h.listeners.change({target:{id:'search',value:'private-name'}});assert.equal(h.ctx.dataLayer.at(-1)[2].action,'search');
h.listeners.click({target:{closest:()=>({href:'https://skiguessr.com/?private=secret',matches:s=>s==='a.project'})}});assert.equal(h.ctx.dataLayer.at(-1)[2].project,'skiguessr');
h.buttons[1].click();assert.equal(h.ctx['ga-disable-G-E4D48915NT'],true);const revoked=h.ctx.dataLayer.length;h.ctx.SiteAnalytics.track('field_notes_use',{action:'search'});assert.equal(h.ctx.dataLayer.length,revoked);
h.buttons[0].click();assert.equal(h.scripts.length,1);assert.equal(h.ctx['ga-disable-G-E4D48915NT'],false);
assert.equal(harness({choice:'granted'}).scripts.length,1);
for(const opts of [{choice:'granted',privateSignal:true},{choice:'granted',host:'localhost'},{choice:'granted',host:'personal-website-preview.vercel.app'},{blockedStorage:true}])assert.equal(harness(opts).scripts.length,0);
const off=harness({choice:'granted',search:'?analytics=off'});assert.equal(off.scripts.length,0);assert.equal(off.choice,'denied');assert.equal(harness({choice:off.choice}).scripts.length,0);off.buttons[0].click();assert.equal(off.scripts.length,1);
h.ctx.storageListener({key:'personal-site.analytics.v1',newValue:'denied'});assert.equal(h.ctx['ga-disable-G-E4D48915NT'],true);
console.log('Consent, privacy signals, host gating, safe event parameters, opt-out, and cross-tab revocation passed.');
