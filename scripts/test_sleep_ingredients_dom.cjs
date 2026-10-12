// DOM integration test, not a browser/visual check. Requires jsdom in the test environment.
const {JSDOM}=require(process.env.SLEEP_DOM_TEST_MODULE||'jsdom'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'pokemon-sleep/ingredients/index.html'),'utf8');
const dom=new JSDOM(html,{url:'https://davidzlchen.com/pokemon-sleep/ingredients/?analytics=off',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,errors=[];w.addEventListener('error',e=>errors.push(e.message));w.HTMLElement.prototype.scrollIntoView=function(){};
w.fetch=async url=>{const u=new URL(url,w.location.href);const file=path.join(root,u.pathname);return {ok:fs.existsSync(file),json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))};};
w.Worker=class{
 constructor(){this.dead=false;}
 terminate(){this.dead=true;}
 postMessage(data){queueMicrotask(()=>{const ctx=vm.createContext({});ctx.self=ctx;ctx.importScripts=()=>{ctx.SleepAnalyzer=require(path.join(root,'pokemon-sleep/analyzer/engine.js'));ctx.SleepUpgrades=require(path.join(root,'pokemon-sleep/upgrades/engine.js'));ctx.SleepIngredients=require(path.join(root,'pokemon-sleep/ingredients/model.js'));};ctx.postMessage=msg=>{if(!this.dead){try{this.onmessage?.({data:JSON.parse(JSON.stringify(msg))});}catch(e){errors.push(e.message);console.error('CLIENT',e.stack);throw e;}}};vm.runInContext(fs.readFileSync(path.join(root,'pokemon-sleep/ingredients/worker.js'),'utf8'),ctx);ctx.onmessage({data});});}
};
for(const file of ['pokemon-sleep/asset-data.js','pokemon-sleep/analyzer/engine.js','pokemon-sleep/upgrades/engine.js','pokemon-sleep/ingredients/model.js','pokemon-sleep/ingredients/app.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),dom.getInternalVMContext());
const $=id=>w.document.getElementById(id),change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('change',{bubbles:true}));};
(async()=>{
 while($('results').hidden){await new Promise(r=>setTimeout(r,20));assert.ok(!errors.length,errors.join('\n'));}
 assert.equal($('snapshot').value,'2026-10-11-216ba00d4db6');assert.match($('supplies').textContent,/810,361/);
 assert.equal($('overview').children.length,$('ingredient').options.length);assert.ok($('candidates').children.length>0);assert.ok($('reference').children.length>0);
 change('ingredient','Honey');$('aaa').checked=false;$('aaa').dispatchEvent(new w.Event('change'));
 const pinsir=[...$('candidates').querySelectorAll('article')].find(a=>a.textContent.includes('Pinsir'));assert.ok(pinsir);assert.match(pinsir.textContent,/Lv\. 59/);assert.match(pinsir.textContent,/655 Pinsir Candy/);assert.match(pinsir.textContent,/276,049 Dream Shards/);
 assert.match(pinsir.querySelector('a').href,/snapshot=2026-10-11/);assert.match(pinsir.querySelector('a').href,/analytics=off/);
 $('aaa').checked=true;$('aaa').dispatchEvent(new w.Event('change'));assert.ok(!$('candidates').textContent.includes('Pinsir'));
 change('ingredient','Warming Ginger');assert.match($('candidates').textContent,/Tyranitar/);assert.match($('candidates').textContent,/AAA/);
 change('ingredient','Soothing Cacao');$('evolutions').checked=true;$('evolutions').dispatchEvent(new w.Event('change'));assert.match($('candidates').textContent,/Wooper/);assert.match($('candidates').textContent,/Current-form projection/);
 change('snapshot','2026-10-04-1c3647d40662');while($('results').hidden){await new Promise(r=>setTimeout(r,20));assert.ok(!errors.length,errors.join('\n'));}assert.match($('supplies').textContent,/930,177/);assert.match($('back').href,/snapshot=2026-10-04/);
 console.log('DOM integration: latest/older paired snapshots, overview, AAA/mixed/evolution filters, Pinsir peak costs, milestone tables, species reference, context links, and no runtime errors pass.');console.log($('limitations').textContent);dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;dom.window.close();});
