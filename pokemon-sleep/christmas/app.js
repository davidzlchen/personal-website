(function(){
'use strict';
const $=id=>document.getElementById(id),make=(tag,value,cls)=>{const el=document.createElement(tag);if(value!==undefined)el.textContent=value;if(cls)el.className=cls;return el;},P=SleepChristmas,U=SleepUpgrades,I=SleepIngredients,params=new URLSearchParams(location.search),int=n=>Math.round(n).toLocaleString('en-US'),fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:1});
let manifest,catalog,levels,snapshot,inventory,roster,data,candidates=[],choices={},familyStock={},items={},plan=[],loadToken=0;
const sources=new Map();
async function read(path){const url=new URL(path,location.href).pathname;if(!sources.has(url))sources.set(url,fetch(url,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Could not load '+url);return r.text();}).catch(e=>{sources.delete(url);throw e;}));return sources.get(url);}
const json=async path=>JSON.parse(await read(path));
const key=()=>`sleep-christmas-v1:${$('snapshot').value}`;
function settings(){const shards=Math.max(0,Number($('shards').value)||0),reserve=Math.max(0,Number($('reserve').value)||0);return {shards,reserve,budget:Math.max(0,shards-reserve),days:Math.max(1,Math.min(31,Math.floor(Number($('days').value)||7))),candy:familyStock,items:{...items,'Neutralizing Mint':Math.max(0,Math.floor(Number($('mints').value)||0)),'Sub Skill Seed':Math.max(0,Math.floor(Number($('seeds').value)||0))}};}
function persist(){try{localStorage.setItem(key(),JSON.stringify({choices,familyStock,plan,settings:Object.fromEntries(['shards','reserve','days','mints','seeds'].map(id=>[id,$(id).value]))}));}catch{}}
function contextURL(path,mon){const url=new URL(path,location.origin);url.searchParams.set('snapshot',$('snapshot').value);if(params.get('analytics')==='off')url.searchParams.set('analytics','off');if(mon)url.searchParams.set('pokemon',mon.id);return url.href;}
function grade(mon){return (mon.favorite?10:0)+(mon.main_skill?.level||0)*3+mon.level/10+mon.subskills.filter(s=>/Skill Trigger M|Ingredient Finder M|Helping Speed M|Berry Finding S/.test(s.name)).length*3;}
function validTargets(c,variant){return P.targets(c.mon,U.capForRank(inventory.researcher_rank,levels.cap)).filter(level=>!variant.row||variant.row.projections.some(p=>p.level===level&&(!variant.seeds||p.seedCount)));}
function evaluate(c){
    const mon=c.mon,choice=choices[c.id],variant=c.variants.find(v=>v.key===choice.variant)||c.variants[0],allowed=validTargets(c,variant),target=allowed.includes(Number(choice.target))?Number(choice.target):allowed[0],family=inventory.pokemon_candies?.[c.id]?.name;
    if(!target||target<=mon.level)throw Error('No future milestone within the saved trainable cap.');
    const projectedMon=variant.mint?{...mon,nature_neutralized:true}:mon;
    let projection=null;
    if(variant.row){projection=I.best(variant.row.projections.filter(p=>p.level===target&&(!variant.seeds||p.seedCount)),c.ingredient);if(!projection)throw Error('This build has no verified projection at the selected level.');}
    const extra=projection?.costs||{},options=P.strategies(projectedMon,target,levels,familyStock[family]||0,extra);
    if(variant.mint)for(const mode of options)mode.items['Neutralizing Mint']=1;
    const recommendation=P.recommend(c,target,options,familyStock[family]||0),mode=options.find(o=>o.key===(choice.mode||recommendation.mode))||options.find(o=>o.key===recommendation.mode);
    const unlocks=U.unlocks(mon,target,70).filter(s=>!s.startsWith('Current level cap:'));
    let backup=false,backupName='';
    if(projection){const peer=data.rows.filter(r=>r.id!==mon.id).map(r=>({row:r,amount:r.projections[0].ingredients[c.ingredient]||0})).sort((a,b)=>b.amount-a.amount)[0];if(peer&&peer.amount>=(projection.ingredients[c.ingredient]||0)*.95){backup=true;backupName=roster.find(m=>m.id===peer.row.id)?.species||'another saved helper';}}
    const preferred=roster.filter(m=>inventory.pokemon_candies?.[m.id]?.name===family).sort((a,b)=>grade(b)-grade(a))[0];
    const duplicate=c.rare&&preferred?.id!==mon.id,evolutionReview=mon.specialty!=='Ingredients'&&(SleepAnalyzer.matchSpecies(catalog,mon)?.remainingEvolutions||0)>0;
    return {id:c.id,name:mon.nickname||mon.species,mon,c,variant,target,family,projection,options,recommendation,mode,unlocks,backup,backupName,duplicate,evolutionReview,priority:recommendation.priority+(mon.favorite?5:0)+(mon.main_skill?.level>=5?5:0),costs:mode};
}
function materialize(entries){return entries.flatMap(e=>{try{const c=candidates.find(c=>c.id===e.id);if(!c)return [];const saved=choices[e.id];try{choices[e.id]={...e};return [evaluate(c)];}finally{choices[e.id]=saved;}}catch{return [];}});}
const entry=r=>({id:r.id,target:r.target,variant:r.variant.key,mode:r.mode.key});
function canAdd(row){if(!row.family)return {fits:false,issues:['Family candy balance unavailable']};return P.ledger([...materialize(plan.filter(p=>p.id!==row.id)),row],settings());}
function renderPlan(){
    const rows=materialize(plan),state=P.ledger(rows,settings()),config=settings(),box=$('plan-items');box.replaceChildren();
    $('plan-total').className='plan-summary';$('plan-total').textContent=`${int(state.shards)} / ${int(config.budget)} spendable shards · ${int(state.boosted)} / ${int(config.days*500)} boosted candy`;
    if(!rows.length)box.append(make('p','No spending selected. Build a draft or add individual targets.','muted'));
    for(const row of rows){const line=make('div',undefined,'plan-row'),body=make('div');body.append(make('strong',`${row.name} → ${row.projection?.form.name||row.mon.species} Lv. ${row.target}`),make('p',`${row.mode.label}${row.variant.key==='saved'?'':' · '+row.variant.label} · ${int(row.costs.shards)} shards · ${int(row.costs.candy)} ${row.family}`),make('p',`${int(row.costs.boosted)} boosted + ${int(row.costs.normal)} normal leveling candy${row.costs.evolutionCandy?' + '+row.costs.evolutionCandy+' evolution candy':''}`));
        const requirements=[...Object.entries(row.costs.items).map(([n,q])=>`${q} ${n}`),...row.costs.conditions];if(requirements.length)body.append(make('p',requirements.join(' · '),'cost-note'));
        const remove=make('button','Remove','remove-plan');remove.type='button';remove.setAttribute('aria-label','Remove '+row.name);remove.addEventListener('click',()=>{plan=plan.filter(p=>p.id!==row.id);render();});line.append(body,remove);box.append(line);}
    box.append(make('p',`${int(config.shards-state.shards)} projected shards left · ${int(config.reserve)} reserved.`,'muted'));
    for(const [family,n] of Object.entries(state.candy))box.append(make('p',`${family}: ${int(n)} planned / ${int(familyStock[family]||0)} available · ${int((familyStock[family]||0)-n)} left`,'muted'));
    const warnings=[...state.issues];if(rows.some(r=>r.costs.conditions.length))warnings.push('Check the listed evolution requirements before spending.');
    $('plan-warning').textContent=warnings.join(' · ');$('schedule').replaceChildren();
    for(const day of state.schedule){const line=make('p',`Day ${day.day}: ${day.total} / 500 boosted candy${day.allocations.length?' · '+day.allocations.map(a=>a.name+' '+a.candy).join(', '):' · unused'}`);$('schedule').append(line);}
}
function renderCandidates(){
    const role=$('role').value,query=$('search').value.trim().toLowerCase(),box=$('candidates');box.replaceChildren();let unavailable=[];
    const rows=candidates.map(c=>{try{return evaluate(c);}catch(e){unavailable.push(`${c.mon.species}: ${e.message}`);return null;}}).filter(Boolean).sort((a,b)=>b.priority-a.priority||a.costs.shards-b.costs.shards);
    const visible=rows.filter(r=>(role==='all'||(role==='rare'?r.c.rare:r.mon.specialty===role))&&`${r.name} ${r.c.ingredient||''}`.toLowerCase().includes(query));
    $('candidate-note').textContent=`${visible.length} top saved candidates · ingredient targets always include 30/60 when still ahead. Costs are incremental from saved EXP; shared families are counted once in the plan.`;
    for(const row of visible){
        const {mon,c}=row,card=make('article',undefined,'christmas-card');card.dataset.pokemon=mon.id;const head=make('div',undefined,'card-head'),img=make('img');img.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${mon.national_dex}.png`;img.alt='';img.loading='lazy';const title=make('div');title.append(make('h3',row.name),make('p',`Lv. ${mon.level} · ${mon.specialty}${c.rare?' · Rare candy':''}${mon.shiny?' · Shiny':''}${mon.favorite?' · Favorite':''}`));head.append(img,title);card.append(head,make('p',c.reason,'muted'));
        const controls=make('div',undefined,'card-choices');
        const control=(label,values,value,callback)=>{const wrap=make('label',label),select=make('select');select.setAttribute('aria-label',label+' for '+row.name);for(const [v,t] of values){const o=make('option',t);o.value=v;select.append(o);}select.value=value;select.addEventListener('change',()=>{callback(select.value);render();});wrap.append(select);controls.append(wrap);};
        control('Target',validTargets(c,row.variant).map(l=>[String(l),`Level ${l}${l===30||l===60?' · ingredient slot':''}`]),String(row.target),v=>{choices[c.id].target=Number(v);delete choices[c.id].mode;});
        control('Build',c.variants.map(v=>[v.key,v.label]),row.variant.key,v=>{choices[c.id].variant=v;delete choices[c.id].mode;});card.append(controls);
        if(row.projection){const p=make('p',undefined,'output-line'),path=sleepAssets.ingredients?.[c.ingredient];if(path){const icon=make('img');icon.src='/pokemon-sleep/assets/'+path;icon.alt='';p.append(icon);}const before=data.rows.find(r=>r.id===c.id)?.projections[0].ingredients[c.ingredient]||0;p.append(make('span',`${fmt(before)} → ${fmt(row.projection.ingredients[c.ingredient]||0)} ${c.ingredient}/day · ${row.projection.form.name}`));card.append(p);}
        if(row.unlocks.length)card.append(make('p',row.unlocks.join(' · '),'strategy-details'));
        if(mon.nature_neutralized||row.variant.mint)card.append(make('p','Neutral nature effects used for EXP costs.','muted'));else if(mon.nature_effects?.['EXP gains'])card.append(make('p',`EXP gains ${mon.nature_effects['EXP gains']} included in candy costs.`,'muted'));
        card.append(make('p',row.recommendation.reason,'card-reason'));
        if(row.backup)card.append(make('p',`Backup investment: ${row.backupName} already gathers about this much ${c.ingredient}. The draft saves resources for other gaps.`,'cost-note'));
        if(row.evolutionReview)card.append(make('p','Current form only: evolution resources are not priced for this specialist. Review evolution before committing; the draft skips this helper.','cost-note'));
        if(row.duplicate)card.append(make('p','Another saved helper in this candy family has more favorite/main-skill/build investment. Review before splitting rare candy.','cost-note'));
        const table=make('table',undefined,'strategy-table');table.append(make('caption',row.projection?'Same target · total costs including evolution':'Same target · current-form feeding costs'));const th=make('tr');for(const label of ['Strategy','Candy','Shards','Boosted'])th.append(make('th',label));const thead=make('thead');thead.append(th);table.append(thead);const tbody=make('tbody');
        for(const mode of row.options.filter(m=>m.key!=='early'||mon.level<30)){const tr=make('tr',undefined,mode.key===row.mode.key?'chosen':''),td=make('td'),label=make('label'),radio=make('input');radio.type='radio';radio.name='mode-'+row.id;radio.value=mode.key;radio.checked=mode.key===row.mode.key;radio.addEventListener('change',()=>{choices[row.id].mode=mode.key;render();});label.append(radio,make('span',' '+mode.label+(mode.key===row.recommendation.mode?' · recommended':'')));td.append(label);tr.append(td);for(const n of [mode.candy,mode.shards,mode.boosted])tr.append(make('td',int(n)));tbody.append(tr);}table.append(tbody);card.append(table);
        card.append(make('p',row.costs.candySaved?`Save ${int(row.costs.candySaved)} family candy for ${int(row.costs.extraShards)} extra shards · ${int(row.costs.shardsPerCandySaved)} extra shards per candy saved.`:'No boost premium. Keep event capacity for another helper.','strategy-details'));
        const required=[...Object.entries(row.costs.items).map(([n,q])=>`${q} ${n}`),...row.costs.conditions.map(t=>'Check: '+t)];if(required.length)card.append(make('p',required.join(' · '),'cost-note'));
        const stock=make('details',undefined,'stock-input'),summary=make('summary',`${int(familyStock[row.family]||0)} ${row.family||'family candy'} available by Christmas`),label=make('label','Projected family candy (shared across this family)'),input=make('input');input.type='number';input.min='0';input.step='1';input.value=familyStock[row.family]||0;input.setAttribute('aria-label','Projected '+row.family);input.addEventListener('change',()=>{familyStock[row.family]=Math.max(0,Math.floor(Number(input.value)||0));render();});label.append(input);stock.append(summary,label);card.append(stock);
        const fits=canAdd(row),button=make('button',plan.some(p=>p.id===row.id)?'Update plan':'Add to plan','add-plan');button.type='button';button.disabled=!fits.fits;button.addEventListener('click',()=>{if(!canAdd(row).fits)return;plan=plan.filter(p=>p.id!==row.id);plan.push(entry(row));render();});card.append(button);if(!fits.fits)card.append(make('p',fits.issues.join(' · '),'cost-note'));
        const link=make('a','Saved Pokémon →');link.href=contextURL('/pokemon-sleep/',mon);link.style.display='block';link.style.marginTop='16px';card.append(link);box.append(card);
    }
    $('unavailable').textContent=unavailable.length?'Not priced: '+unavailable.join(' · '):'';
    if(!visible.length)box.append(make('p','No top candidates match these filters.'));
}
function render(){if(!data)return;$('back').href=contextURL('/pokemon-sleep/ingredients/');const u=new URL(location.href);u.searchParams.set('snapshot',$('snapshot').value);history.replaceState(null,'',u);renderPlan();renderCandidates();persist();}
function suggest(){
    plan=[];const plannedIngredients=new Set(),families=new Set();const ranked=candidates.map(c=>{try{const saved=choices[c.id];choices[c.id]={...saved,mode:undefined};const row=evaluate(c);choices[c.id]=saved;return row;}catch{return null;}}).filter(Boolean).sort((a,b)=>b.priority-a.priority||a.costs.shards-b.costs.shards);
    for(const row of ranked){if(row.backup||row.duplicate||row.evolutionReview||(row.mon.specialty==='Skills'&&row.mon.level>=50&&!row.c.rare)||row.costs.conditions.length||families.has(row.family)||(row.c.ingredient&&plannedIngredients.has(row.c.ingredient)))continue;
        if(canAdd(row).fits){plan.push(entry(row));choices[row.id].mode=row.mode.key;families.add(row.family);if(row.c.ingredient)plannedIngredients.add(row.c.ingredient);}
        else{for(const mode of ['stretch','early','normal'].map(key=>row.options.find(o=>o.key===key)).filter(Boolean)){
            const fallback={...row,mode,costs:mode};if(canAdd(fallback).fits){plan.push(entry(fallback));choices[row.id].mode=mode.key;families.add(row.family);if(row.c.ingredient)plannedIngredients.add(row.c.ingredient);break;}
        }}
    }
    render();
}
async function load(){
    const token=++loadToken;$('workspace').hidden=true;$('status').hidden=false;$('status').textContent='Loading saved candidates…';$('retry').hidden=true;
    try{snapshot=manifest.snapshots.find(s=>s.id===$('snapshot').value);const paired=await json('/pokemon-sleep/'+snapshot.file);data=await SleepIngredientCache.load(read,snapshot.file);if(token!==loadToken)return;if(!data)throw Error('The saved calculation cache is unavailable. Retry after the snapshot is published.');
        inventory=paired.inventory;roster=paired.roster.records;choices={};plan=[];familyStock={};items={};for(const e of inventory.entries||[])items[e.name]=(items[e.name]||0)+e.quantity;for(const c of Object.values(inventory.pokemon_candies||{}))familyStock[c.name]=Math.max(familyStock[c.name]||0,c.quantity);
        const pool=P.shortlist(roster,data),focused=roster.find(m=>m.id===params.get('pokemon'));if(focused&&!pool.some(c=>c.id===focused.id))pool.push({id:focused.id,mon:focused,rare:false,reason:'Selected from your ingredient analysis',ingredient:params.get('ingredient')||focused.ingredients[0]?.name});candidates=pool.map(c=>({...c,ingredient:c.id===focused?.id&&params.has('ingredient')?params.get('ingredient'):c.ingredient,variants:P.variants(c,data)}));
        for(const c of candidates)choices[c.id]={id:c.id,variant:'saved',target:P.defaultTarget(c.mon,U.capForRank(inventory.researcher_rank,levels.cap))};
        for(const [id,value] of Object.entries({shards:inventory.dream_shards,reserve:Math.round(inventory.dream_shards*.25),days:7,mints:items['Neutralizing Mint']||0,seeds:items['Sub Skill Seed']||0}))$(id).value=value;
        try{const saved=JSON.parse(localStorage.getItem(key()));if(saved){familyStock={...familyStock,...saved.familyStock};for(const [id,c] of Object.entries(saved.choices||{}))if(choices[id])choices[id]={...choices[id],...c};plan=(saved.plan||[]).filter(p=>choices[p.id]);for(const id of ['shards','reserve','days','mints','seeds'])if(saved.settings?.[id]!==undefined)$(id).value=saved.settings[id];}}catch{}
        const requested=candidates.find(c=>c.id===params.get('pokemon'));if(requested&&requested.variants.some(v=>v.key===params.get('variant'))){choices[requested.id].variant=params.get('variant');delete choices[requested.id].mode;}if(requested&&params.has('target')){const target=Number(params.get('target'));if(P.targets(requested.mon,70).includes(target))choices[requested.id].target=target;}
        $('stock-note').textContent=`Saved ${snapshot.captured_at} · ${int(inventory.dream_shards)} Dream Shards · ${roster.length} helpers. Default reserve: 25% of saved shards.`;
        $('workspace').hidden=false;$('status').hidden=true;render();if(requested){$('search').value=requested.mon.species;renderCandidates();$('candidates').scrollIntoView({block:'start'});}
    }catch(error){if(token!==loadToken)return;$('workspace').hidden=true;$('status').hidden=false;$('status').textContent=error.message;$('retry').hidden=false;}
}
(async()=>{try{[manifest,catalog,levels]=await Promise.all([json('/pokemon-sleep/history.json'),json('/pokemon-sleep/analyzer/data.json'),json('/pokemon-sleep/upgrades/levels.json')]);for(const s of manifest.snapshots.slice().reverse()){const o=make('option',s.captured_at);o.value=s.id;$('snapshot').append(o);}$('snapshot').value=manifest.snapshots.some(s=>s.id===params.get('snapshot'))?params.get('snapshot'):manifest.snapshots.at(-1).id;await load();}catch(error){$('status').textContent=error.message;$('retry').hidden=false;}})();
$('snapshot').addEventListener('change',load);$('retry').addEventListener('click',load);for(const id of ['shards','reserve','days','mints','seeds','role'])$(id).addEventListener('change',render);$('search').addEventListener('input',renderCandidates);$('suggest').addEventListener('click',suggest);$('clear').addEventListener('click',()=>{plan=[];render();});
})();
