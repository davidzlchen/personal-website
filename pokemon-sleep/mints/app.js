(function(){
'use strict';
const $=id=>document.getElementById(id),make=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;},fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:Math.abs(n)<1?2:1}),params=new URLSearchParams(location.search);
const sources=new Map();let manifest,paired,mints,worker,request=0;
async function read(path){if(!sources.has(path))sources.set(path,fetch(path,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Saved data could not be loaded.');return r.text();}).catch(e=>{sources.delete(path);throw e;}));return sources.get(path);}
async function json(path){return JSON.parse(await read(path));}
function link(path,mon){const u=new URL(path,location.origin);u.searchParams.set('snapshot',$('snapshot').value);if(mon)u.searchParams.set('pokemon',mon.id);for(const key of ['analytics','island'])if(params.has(key))u.searchParams.set(key,params.get(key));return u.href;}
function render(){
 const u=new URL(location.href);for(const [key,value] of [['snapshot',$('snapshot').value],['specialty',$('specialty').value],['aaa',String($('aaa').checked)],['favorites',String($('favorites').checked)]])u.searchParams.set(key,value);history.replaceState(null,'',u);$('back').href=link('/pokemon-sleep/');$('ingredients').href=link('/pokemon-sleep/ingredients/');
 const list=SleepMints.candidates(mints.rows,paired.roster.records,{specialty:$('specialty').value,aaa:$('aaa').checked,favorites:$('favorites').checked,query:$('search').value.trim()}),box=$('candidates');box.replaceChildren();$('count').textContent=`${list.length} candidates with at least 1% specialty improvement. Ranked within each specialty; 1 mint each.`;
 for(const [specialty,metric,label] of [['Ingredients','totalIngredients','Gathered ingredients'],['Skills','triggers','Skill triggers'],['Berries','berries','Berries']]){
  const group=list.filter(r=>r.mon.specialty===specialty);if(!group.length)continue;
  const section=make('section',undefined,'mint-group'),heading=make('h2',({Ingredients:'Ingredient',Skills:'Skill',Berries:'Berry'})[specialty]+' candidates'),cards=make('div',undefined,'opportunity-list');section.append(heading,make('p','Largest '+label.toLowerCase()+' gain per day first.'),cards);
  for(const r of group){
   const mon=r.mon,card=make('article',undefined,'opportunity'),head=make('div',undefined,'opportunity-head'),image=make('img');image.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${mon.national_dex}.png`;image.alt=mon.species;image.loading='lazy';const title=make('div');title.append(make('h3',mon.nickname||mon.species),make('p',`${mon.species} · Lv. ${mon.level}${mon.favorite?' · Favorite':''}${specialty==='Ingredients'?' · '+(r.aaa?'AAA':'Mixed line'):''}`));head.append(image,title);card.append(head,make('p',`+${fmt(r.gain)} ${label.toLowerCase()}/day · +${fmt(r.percent)}%`,'gain'),make('p',`${mon.nature} effects → neutral`,'gain-label'));
   card.append(make('p',Object.entries(r.effects).map(([name,direction])=>`${name} ${direction==='up'?'↑':'↓'} removed`).join(' · '),'mint-effects'));
   const table=make('table',undefined,'mint-comparison');table.append(make('caption','Same saved level · daily output'));const header=make('tr');for(const text of ['Output','Now','Minted','Change'])header.append(make('th',text));const thead=make('thead');thead.append(header);table.append(thead);const body=make('tbody');
   for(const [key,name] of [['totalIngredients','Ingredients'],['triggers','Skill triggers'],['berries','Berries']]){const delta=r.after[key]-r.before[key],tr=make('tr');for(const text of [name,fmt(r.before[key]),fmt(r.after[key]),(delta>0?'+':'')+fmt(delta)])tr.append(make('td',text));tr.lastChild.className=delta>=0?'mint-positive':'mint-negative';body.append(tr);}table.append(body);card.append(table);
   const ingredients=make('div',undefined,'mint-ingredients');for(const name of new Set([...Object.keys(r.before.ingredients),...Object.keys(r.after.ingredients)])){const span=make('span'),path=sleepAssets.ingredients[name];if(path){const img=make('img');img.src='/pokemon-sleep/assets/'+path;img.alt=name;span.append(img);}span.append(make('span',`${fmt(r.before.ingredients[name]||0)} → ${fmt(r.after.ingredients[name]||0)}/day`));ingredients.append(span);}card.append(ingredients);
   card.append(make('p','1 Neutralizing Mint · 0 candy · 0 Dream Shards','candidate-meta'),make('p','Unlocked subskills: '+mon.subskills.filter(s=>s.unlock_level<=mon.level).map(s=>s.name).join(' · '),'candidate-meta'));
   const a=make('a','View saved Pokémon →');a.href=link('/pokemon-sleep/',mon);card.append(a);cards.append(card);
  }box.append(section);
 }
 if(!list.length)box.append(make('p','No saved Pokémon improve their specialty output under these filters.'));
 $('excluded').textContent=mints.excluded.length?'Unavailable comparisons: '+mints.excluded.map(r=>`${paired.roster.records.find(m=>m.id===r.id)?.species}: ${r.reason}`).join(' · '):'';
}
async function load(){
 const token=++request;worker?.terminate();mints=null;$('results').hidden=true;$('status').hidden=false;$('status').textContent='Loading saved comparisons…';$('retry').hidden=true;
 try{
  const entry=manifest.snapshots.find(e=>e.id===$('snapshot').value);const snapshot=await json('/pokemon-sleep/'+entry.file);if(token!==request)return;paired=snapshot;
  if(paired.roster.captured_at!==entry.captured_at||paired.inventory.captured_at!==entry.captured_at)throw Error('Snapshot dates do not match.');
  const stock=paired.inventory.entries?.filter(e=>e.name==='Neutralizing Mint').reduce((n,e)=>n+e.quantity,0);$('supplies').textContent=`Saved ${entry.captured_at} · ${stock===undefined?'Mint balance unavailable':stock+' Neutralizing Mints available'}. Each comparison uses one mint; saved Pokémon are unchanged.`;
  const result=await SleepIngredientCache.load(read,entry.file);if(token!==request)return;
  function finish(data){mints=data;$('results').hidden=false;$('status').hidden=true;render();}
  if(result?.mints){finish(result.mints);return;}
  const [catalog,levels,evolutions]=await Promise.all([json('/pokemon-sleep/analyzer/data.json'),json('/pokemon-sleep/upgrades/levels.json'),json('/pokemon-sleep/ingredients/evolutions.json')]);if(token!==request)return;
  worker=new Worker('/pokemon-sleep/ingredients/worker.js?v=5');worker.onmessage=({data})=>{if(token!==request)return;if(data.error){worker.terminate();$('status').textContent=data.error;$('retry').hidden=false;}else if(data.mints){worker.terminate();finish(data.mints);}else $('status').textContent='Calculating… '+data.progress;};worker.onerror=()=>{if(token===request){worker.terminate();$('status').textContent='Comparison could not finish.';$('retry').hidden=false;}};worker.postMessage({catalog,roster:paired.roster.records,cap:levels.cap,levels,evolutions});
 }catch(error){if(token===request){$('status').textContent=error.message;$('retry').hidden=false;}}
}
async function initialize(){try{manifest=await json('/pokemon-sleep/history.json');$('snapshot').replaceChildren(...manifest.snapshots.map(s=>{const o=make('option',s.captured_at);o.value=s.id;return o;}));if(params.has('snapshot')&&!manifest.snapshots.some(s=>s.id===params.get('snapshot')))throw Error('Snapshot unavailable.');$('snapshot').value=params.get('snapshot')||manifest.snapshots.at(-1).id;if(['Ingredients','Skills','Berries'].includes(params.get('specialty')))$('specialty').value=params.get('specialty');$('aaa').checked=params.get('aaa')!=='false';$('favorites').checked=params.get('favorites')==='true';await load();}catch(error){$('status').textContent=error.message;$('retry').hidden=false;}}
$('snapshot').addEventListener('change',load);for(const id of ['specialty','aaa','favorites'])$(id).addEventListener('change',()=>{if(mints)render();});$('search').addEventListener('input',()=>{if(mints)render();});$('retry').addEventListener('click',()=>manifest?load():initialize());initialize();
})();
