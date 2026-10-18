(function(){
    'use strict';
    const $=id=>document.getElementById(id),make=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
    const params=new URLSearchParams(location.search),fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:1}),int=n=>n.toLocaleString('en-US');
    let catalog,levels,manifest,evolutions,roster=[],inventory,rows=[],references=[],excluded=[],worker,request=0,cap,total=0,mintRows=[],ingredients=[],selectedIngredient;
    const sources=new Map(),sessionResults=new Map();let mintAnchorShown=false;
    async function text(path){
        const url=new URL(path,location.href).pathname;
        if(!sources.has(url))sources.set(url,fetch(url,{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error('Data could not be loaded.');return response.text();}).catch(error=>{sources.delete(url);throw error;}));
        return sources.get(url);
    }
    async function json(path){return JSON.parse(await text(path));}
    function showResults(data){
        ({rows,references,excluded,total}=data);mintRows=data.mints?.rows||[];$('results').hidden=false;$('status').hidden=true;
        $('limitations').textContent=excluded.length?'Unmodeled saved helpers: '+excluded.map(r=>`${name(roster.find(m=>m.id===r.id))}: ${r.reason}`).join(' · '):'Every saved ingredient specialist has supported current production.';render();if(location.hash==='#mint-analysis'&&!mintAnchorShown){mintAnchorShown=true;$('mint-analysis').scrollIntoView({block:'start'});}
    }
    function icon(name){const path=sleepAssets.ingredients?.[name];if(!path)return null;const img=make('img');img.src='/pokemon-sleep/assets/'+path;img.alt='';return img;}
    function portrait(dex,name){const img=make('img');img.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dex}.png`;img.alt=name;img.loading='lazy';return img;}
    function name(mon){return mon.nickname||mon.species;}
    function filters(){return {aaa:$('aaa').checked,evolutions:$('evolutions').checked,sort:$('sort').value};}
    function options(ingredient){
        const config=filters(),list=SleepIngredients.candidates(rows,roster,ingredient,config).map(r=>({...r,practical:SleepPracticalIngredients.recommend(r,r.mon,ingredient,inventory)}));
        return list.sort((a,b)=>config.sort==='current'?(b.current.ingredients[ingredient]||0)-(a.current.ingredients[ingredient]||0):config.sort==='cost'?(a.practical.target.costs?.shards??Infinity)-(b.practical.target.costs?.shards??Infinity):(b.practical.target.ingredients[ingredient]||0)-(a.practical.target.ingredients[ingredient]||0));
    }
    function link(path,mon){const u=new URL(path,location.origin);u.searchParams.set('snapshot',$('snapshot').value);if(params.has('island'))u.searchParams.set('island',params.get('island'));if(mon)u.searchParams.set('pokemon',mon.id);if(params.get('analytics')==='off')u.searchParams.set('analytics','off');return u.href;}
    function leaders(list,ingredient){return {now:list.filter(r=>(r.current.ingredients[ingredient]||0)>0).sort((a,b)=>(b.current.ingredients[ingredient]||0)-(a.current.ingredients[ingredient]||0))[0],potential:list.slice().sort((a,b)=>(b.practical.target.ingredients[ingredient]||0)-(a.practical.target.ingredients[ingredient]||0))[0]};}
    function renderOverview(){
        const box=$('overview');
        if(!box.children.length)for(const ingredient of ingredients){
            const button=make('button',undefined,'ingredient-tile');button.type='button';button.dataset.ingredient=ingredient;button.setAttribute('aria-label',ingredient);button.title=ingredient;
            const img=icon(ingredient);if(img)button.append(img);else button.append(make('span',ingredient));
            button.addEventListener('click',()=>{selectedIngredient=ingredient;$('search').value='';render();});box.append(button);
        }
        for(const button of box.children)button.setAttribute('aria-pressed',String(button.dataset.ingredient===selectedIngredient));
    }
    function costsBlock(mon,p){
        const box=make('div',undefined,'candidate-costs'),candy=inventory.pokemon_candies?.[mon.id];
        if(!p.costs){box.append(make('p','Resource cost unavailable: '+(p.costError||'Saved EXP unavailable.'),'availability short'));return box;}
        const costs=make('div',undefined,'costs');for(const [amount,label] of [[p.costs.candy,candy?.name||'Family candy'],[p.costs.shards,'Dream Shards']]){
            const span=make('span',undefined,'cost'),path=sleepAssets.items?.[label];if(path){const img=make('img');img.src='/pokemon-sleep/assets/'+path;img.alt='';span.append(img);}span.append(make('span',`${int(amount)} ${label}`));costs.append(span);
        }box.append(costs);
        const resource=SleepIngredients.resources(p.costs,candy,inventory);
        const enough=resource.candyShort===0&&resource.shardShort===0&&resource.itemShort.every(i=>i.needed===0)&&resource.conditions.length===0;
        if(p.costs.evolutionCandy)box.append(make('p',`${int(p.costs.levelCandy)} leveling + ${int(p.costs.evolutionCandy)} evolution candy. Dream Shards are for leveling; evolution itself adds no shard cost.`,'muted'));
        for(const item of resource.itemShort)box.append(make('p',`${item.quantity} ${item.name} · ${item.needed===null?'saved item balance unknown':item.needed?item.needed+' still needed':'available in saved inventory'}`,'availability'+(item.needed?' short':'')));
        for(const condition of resource.conditions)box.append(make('p','Requirement to check: '+condition,'availability short'));
        box.append(make('p',p.costs.candy===0&&p.costs.shards===0?'Already reached · no additional candy or shards.':enough?'Within saved family candy, shard, and item balances.':resource.candyShort===0&&resource.shardShort===0?'Candy and shards available; complete the evolution requirements above.':`Still needed: ${resource.candyShort===null?'family candy balance unknown':int(resource.candyShort)+' family candy'} · ${int(resource.shardShort)} Dream Shards.`,'availability'+(enough?'':' short')));
        if(candy)box.append(make('p',`Saved ${int(candy.quantity)} ${candy.name}; costs are incremental from Lv. ${mon.level}.`,'muted'));
        return box;
    }
    function renderCandidates(){
        const ingredient=selectedIngredient,all=options(ingredient),lead=leaders(all,ingredient),search=$('search').value.trim().toLowerCase();
        const list=all.filter(r=>`${name(r.mon)} ${r.mon.species}`.toLowerCase().includes(search));
        const heading=$('ingredient-heading');heading.replaceChildren();const img=icon(ingredient);if(img)heading.append(img);heading.append(make('span',ingredient));
        const top=$('leaders');top.replaceChildren();
        for(const [title,r,p] of [['Best now',lead.now,lead.now?.current],['Practical target',lead.potential,lead.potential?.practical.target]]){
            const card=make('div',undefined,'summary-stat');card.append(make('span',title));
            if(r){const value=make('strong',`${fmt(p.ingredients[ingredient]||0)} / day`);value.title=`${name(r.mon)}${p.steps?.length?' → '+p.form.name:''} · Lv. ${p.level}`;card.append(value);}else card.append(make('strong','—'));
            top.append(card);
        }
        $('count').textContent=`${list.length} saved candidate${list.length===1?'':'s'} · ${rows.length} of ${total} ingredient specialists modeled · cap Lv. ${cap}.`;
        const box=$('candidates');box.replaceChildren();
        for(const r of list){
            const {mon,current,practical}=r,peak=practical.target,card=make('article',undefined,'opportunity');
            const head=make('div',undefined,'opportunity-head'),title=make('div');title.append(make('h3',name(mon)),make('p',`${mon.species} · saved Lv. ${mon.level}${r.remainingEvolutions?' · unevolved':''}`));head.append(portrait(mon.national_dex,mon.species),title);card.append(head);
            card.append(make('p',`${r.line.aaa?'AAA':'Mixed line'} · ${mon.nature_neutralized?'neutralized nature':mon.nature}`,'candidate-meta'));
            const line=make('div',undefined,'ingredient-line');mon.ingredients.forEach((s,i)=>{const span=make('span'),image=icon(s.name);if(image)span.append(image);span.append(make('span',`${[1,30,60][i]}: ${s.name} ×${s.quantity}`));line.append(span);});card.append(line);
            card.append(make('p',`Now: ${fmt(current.ingredients[ingredient]||0)} ${ingredient}/day`,'candidate-current'),make('p',`${fmt(peak.ingredients[ingredient])} / day`,'gain'),make('p',`${practical.invest?'Recommended target':'Keep current level'} · ${peak.form?.name||mon.species} Lv. ${peak.level} · +${fmt(practical.gain)}/day`,'gain-label'));
            card.append(costsBlock(mon,peak));card.append(make('p',practical.reason,'priority-reason'));
            const maximum=r.peak;
            if(maximum.level>60&&maximum.costs&&peak.costs&&maximum.costs.shards>=peak.costs.shards&&maximum.ingredients[ingredient]>peak.ingredients[ingredient])card.append(make('p',`The Lv. ${maximum.level} maximum adds ${fmt(maximum.ingredients[ingredient]-peak.ingredients[ingredient])}/day beyond this target for another ${int(maximum.costs.shards-peak.costs.shards)} shards and ${int(maximum.costs.candy-peak.costs.candy)} candy.`,'muted'));
            if(r.limitation)card.append(make('p',r.limitation+' Maximum is limited to confirmed saved data.','availability short'));
            if(peak.steps?.length)card.append(make('p','Evolution path: '+[mon.species,...peak.steps.map(step=>catalog.species.find(p=>p.key===step.to)?.name||step.to)].join(' → '),'priority-reason'));
            if(r.remainingEvolutions&&r.evolutionPaths?.length===1)card.append(make('p','Current-form projection only; evolution requirements are unverified.','availability short'));
            if(peak.form)card.append(make('p',`Modeled carry limit before inventory subskills: ${current.carry} → ${peak.carry}. Main skill level: ${current.skillLevel??'unknown'} → ${peak.skillLevel??'unknown'}.`,'candidate-meta'));
            const detail=make('div',undefined,'evolution-milestones');detail.append(make('h4','Evolution milestones and resource costs'));
            const table=make('table',undefined,'milestone-table'),caption=make('caption',`${ingredient} per day; costs from saved level`);table.append(caption);
            const header=make('tr');for(const text of ['Form / level','Per day','Candy','Shards'])header.append(make('th',text));const thead=make('thead');thead.append(header);table.append(thead);
            const milestoneRows=SleepIngredients.milestones(r,ingredient,cap),tbody=make('tbody');for(const p of milestoneRows){
                const tr=make('tr');for(const text of [`${p.form.name} ${p.level}`,fmt(p.ingredients[ingredient]||0),p.costs?int(p.costs.candy):'Unknown',p.costs?int(p.costs.shards):'Unknown'])tr.append(make('td',text));tbody.append(tr);
            }table.append(tbody);detail.append(table);for(const p of milestoneRows.filter((p,i,all)=>all.findIndex(q=>q.form.key===p.form.key)===i)){const needs=[...Object.entries(p.costs?.items||{}).map(([n,q])=>q+' '+n),...(p.costs?.conditions||[])];if(needs.length)detail.append(make('p',p.form.name+': '+needs.join(' · ')));}card.append(detail);
            const subskills=make('p',mon.subskills.filter(s=>s.unlock_level<=peak.level).map(s=>`${s.unlock_level}: ${s.name}`).join(' · '),'candidate-meta');card.append(subskills);
            const a=make('a','View saved Pokémon →');a.href=link('/pokemon-sleep/',mon);card.append(a);box.append(card);
        }
        if(!list.length){box.append(make('p','No saved ingredient specialist matches these filters.'));if($('aaa').checked){const button=make('button','Show mixed ingredient lines','add-plan');button.type='button';button.addEventListener('click',()=>{$('aaa').checked=false;render();});box.append(button);}}
    }
    function renderMints(){
        const ingredient=selectedIngredient,eligible=new Set(options(ingredient).map(r=>r.id)),query=$('search').value.trim().toLowerCase(),box=$('mint-candidates');box.replaceChildren();
        const list=mintRows.map(r=>{
            const mon=roster.find(m=>m.id===r.id),original=rows.find(p=>p.id===r.id);
            if(!mon||!original||!r.plan)return null;
            const practical=SleepPracticalIngredients.recommend(r.plan,{...mon,nature_neutralized:true},ingredient,inventory),target=practical.target;
            const levelOnly=original.projections.find(p=>p.level===target.level&&p.form.key===target.form.key);
            if(!levelOnly)return null;
            const beforeAmount=r.before.ingredients[ingredient]||0,afterAmount=target.ingredients[ingredient]||0,withoutMint=levelOnly?.ingredients[ingredient]||0;
            return {...r,mon,practical,target,levelOnly,beforeAmount,afterAmount,withoutMint};
        }).filter(r=>r&&r.mon.specialty==='Ingredients'&&eligible.has(r.id)&&r.afterAmount>0&&r.afterAmount-r.withoutMint>=Math.max(.01,r.withoutMint*.01)&&`${name(r.mon)} ${r.mon.species}`.toLowerCase().includes(query)).sort((a,b)=>b.practical.score-a.practical.score||(b.afterAmount-b.withoutMint)-(a.afterAmount-a.withoutMint));
        const stock=inventory.entries?.filter(e=>e.name==='Neutralizing Mint').reduce((sum,e)=>sum+e.quantity,0);
        $('mint-summary').textContent=`${list.length} ingredient specialist${list.length===1?' has':'s have'} mint + upgrade plans for ${ingredient}. ${stock===undefined?'Mint balance unavailable':stock+' Neutralizing Mints available'}. Filters above apply here too.`;
        for(const r of list){
            const mon=r.mon,card=make('article',undefined,'opportunity'),head=make('div',undefined,'opportunity-head'),title=make('div');title.append(make('h3',name(mon)),make('p',`${mon.species} · saved Lv. ${mon.level}${mon.favorite?' · Favorite':''} · ${SleepIngredients.line(mon).aaa?'AAA':'Mixed line'}`));head.append(portrait(mon.national_dex,mon.species),title);card.append(head);
            const output=make('p',undefined,'ingredient-line');const img=icon(ingredient);if(img)output.append(img);output.append(make('span',`${ingredient}: ${fmt(r.beforeAmount)} → ${fmt(r.afterAmount)}/day`));card.append(output,make('p',`+${fmt(r.afterAmount-r.beforeAmount)}/day from saved build`,'gain'),make('p',`${mon.nature} effects → neutral`,'gain-label'));
            card.append(make('p',`Mint first → ${r.target.form.name} Lv. ${r.target.level}${r.target.steps.length?' · includes evolution':''}`,'priority-reason'),costsBlock({...mon,nature_neutralized:true},r.target),make('p',r.practical.reason,'muted'));
            card.append(make('p',Object.entries(r.effects).map(([effect,direction])=>`${effect} ${direction==='up'?'↑':'↓'} removed`).join(' · '),'candidate-meta'));
            const table=make('table',undefined,'milestone-table');table.append(make('caption',`Daily output · target ${r.target.form.name} Lv. ${r.target.level}`));const header=make('tr');for(const label of ['Output','Now','Level only','Mint + level'])header.append(make('th',label));const thead=make('thead');thead.append(header);table.append(thead);const body=make('tbody');
            for(const [label,before,without,after] of [[ingredient,r.beforeAmount,r.withoutMint,r.afterAmount],['Skill triggers',r.before.triggers,r.levelOnly?.triggers,r.target.triggers],['Berries',r.before.berries,r.levelOnly?.berries,r.target.berries]]){const tr=make('tr');for(const value of [label,fmt(before),Number.isFinite(without)?fmt(without):'Unknown',fmt(after)])tr.append(make('td',value));tr.lastChild.className=after<without?'mint-loss':'mint-gain';body.append(tr);}table.append(body);card.append(table,make('p',`Mint adds +${fmt(r.afterAmount-r.withoutMint)} ${ingredient}/day versus the same form and level without minting.`,'candidate-meta'),make('p','1 Neutralizing Mint, plus the leveling and evolution resources above. Costs assume minting before feeding candy.','candidate-meta'));
            const milestones=make('table',undefined,'milestone-table');milestones.append(make('caption','Mint + leveling / evolution milestones'));const mh=make('tr');for(const label of ['Form / level','Per day','Candy','Shards'])mh.append(make('th',label));const mt=make('thead');mt.append(mh);milestones.append(mt);const mb=make('tbody');
            for(const p of SleepIngredients.milestones(r.plan,ingredient,cap).filter(p=>p.level<=60||p.level===mon.level)){const tr=make('tr');for(const value of [`${p.form.name} ${p.level}`,fmt(p.ingredients[ingredient]||0),p.costs?int(p.costs.candy):'Unknown',p.costs?int(p.costs.shards):'Unknown'])tr.append(make('td',value));mb.append(tr);}milestones.append(mb);card.append(milestones);
            const a=make('a','View saved Pokémon →');a.href=link('/pokemon-sleep/',mon);card.append(a);box.append(card);
        }
        if(!list.length)box.append(make('p',`No matching ingredient specialists gain ${ingredient} from minting at a practical leveling or evolution target.`));
    }
    function renderReference(){
        const ingredient=selectedIngredient,list=references.filter(r=>r.ingredient===ingredient&&(!$('aaa').checked||r.aaa)).sort((a,b)=>b.amount-a.amount),box=$('reference');box.replaceChildren();$('reference-cap').textContent=String(cap);
        for(const r of list){const card=make('article',undefined,'reference-card'),body=make('div');card.append(portrait(r.dex,r.name));body.append(make('strong',r.name),make('p',`${fmt(r.amount)} ${ingredient}/day`,'reference-output'),make('p',`${r.aaa?'AAA':'Mixed'} · ${r.line.join(' / ')}`));
            const saved=roster.filter(m=>SleepAnalyzer.matchSpecies(catalog,m)?.key===r.key),evolving=rows.filter(row=>row.evolutionPaths.some(p=>p.form.key===r.key&&p.steps.length)&&(!$('aaa').checked||SleepIngredients.line(roster.find(m=>m.id===row.id)).aaa));if(evolving.length)body.append(make('p','Can evolve from your saved '+evolving.map(row=>{const m=roster.find(m=>m.id===row.id);return name(m)+' (Lv. '+m.level+')';}).join(', ')+'. Actual-build evolution costs are shown above.'));body.append(make('p',saved.length?`You have ${saved.length} saved ${r.name}. The benchmark changes nature/subskills; its build is not priced as a level-only upgrade.`:'Not in your saved collection. Catch/evolve first; resource cost depends on the actual saved build.'));card.append(body);box.append(card);
        }
        if(!list.length)box.append(make('p','No supported final-form species matches this ingredient and line filter. Uncheck AAA to see mixed-line sources.'));
    }
    function render(){
        const u=new URL(location.href);u.searchParams.set('snapshot',$('snapshot').value);u.searchParams.set('ingredient',selectedIngredient);u.searchParams.set('aaa',String($('aaa').checked));u.searchParams.delete('evolutions');u.searchParams.set('final-only',String(!$('evolutions').checked));u.searchParams.set('sort',$('sort').value);history.replaceState(null,'',u);
        $('back').href=link('/pokemon-sleep/');$('upgrades').href=link('/pokemon-sleep/upgrades/');
        renderOverview();if(!$('results').hidden){renderCandidates();renderMints();renderReference();}
    }
    async function load(){
        const token=++request;worker?.terminate();rows=[];references=[];excluded=[];$('results').hidden=true;$('supplies').textContent='';$('retry').hidden=true;$('status').hidden=false;$('status').textContent='Loading the paired saved collection…';
        try{
            const entry=manifest.snapshots.find(s=>s.id===$('snapshot').value);if(!entry)throw Error('Snapshot unavailable.');
            const paired=await json('/pokemon-sleep/'+entry.file);if(token!==request)return;
            if(paired.roster.captured_at!==entry.captured_at||paired.inventory.captured_at!==entry.captured_at)throw Error('Saved roster and inventory dates do not match.');
            roster=paired.roster.records;inventory=paired.inventory;cap=SleepUpgrades.capForRank(inventory.researcher_rank,levels.cap);
            if(roster.some(m=>m.level>cap))throw Error('Saved helper levels exceed the research rank cap.');
            $('supplies').textContent=`Saved ${entry.captured_at} · ${int(inventory.dream_shards)} Dream Shards · trainable cap Lv. ${cap}. Island selection does not change ingredient gathering.`;render();
            $('status').textContent='Loading saved analysis…';
            const cached=sessionResults.get(entry.file)||await SleepIngredientCache.load(text,entry.file);
            if(token!==request)return;
            if(cached){sessionResults.set(entry.file,cached);showResults(cached);return;}
            worker=new Worker('worker.js?v=6');worker.onmessage=({data})=>{
                if(token!==request)return;
                if(data.error){worker.terminate();$('status').textContent=data.error;$('retry').hidden=false;}
                else if(data.rows){worker.terminate();sessionResults.set(entry.file,data);showResults(data);}
                else $('status').textContent='Calculating… '+data.progress;
            };worker.onerror=()=>{if(token!==request)return;worker.terminate();$('status').textContent='The calculation could not finish. Retry to calculate again.';$('retry').hidden=false;};worker.postMessage({catalog,roster,cap,levels,evolutions});
        }catch(error){if(token!==request)return;$('status').textContent=error.message;$('retry').hidden=false;}
    }
    async function initialize(){try{
        [catalog,levels,manifest,evolutions]=await Promise.all([json('/pokemon-sleep/analyzer/data.json'),json('/pokemon-sleep/upgrades/levels.json'),json('/pokemon-sleep/history.json'),json('evolutions.json')]);
        ingredients=[...new Set(catalog.species.filter(p=>p.specialty==='ingredient').flatMap(p=>p.ingredients.flat().map(s=>s.name)))].sort();
        if(params.has('ingredient')&&!ingredients.includes(params.get('ingredient')))throw Error('That ingredient is unavailable in the catalog.');
        selectedIngredient=params.get('ingredient')||'Warming Ginger';
        $('snapshot').replaceChildren(...manifest.snapshots.map(s=>{const option=make('option',s.captured_at);option.value=s.id;return option;}));
        if(params.has('snapshot')&&!manifest.snapshots.some(s=>s.id===params.get('snapshot')))throw Error('That saved collection is unavailable.');
        $('snapshot').value=params.get('snapshot')||manifest.snapshots.at(-1).id;
        if(params.has('aaa'))$('aaa').checked=params.get('aaa')!=='false';if(params.has('final-only'))$('evolutions').checked=params.get('final-only')!=='true';if(['max','current','cost'].includes(params.get('sort')))$('sort').value=params.get('sort');await load();
    }catch(error){$('status').textContent=error.message;$('retry').hidden=false;}}
    $('snapshot').addEventListener('change',load);for(const id of ['aaa','evolutions','sort'])$(id).addEventListener('change',render);$('search').addEventListener('input',render);$('retry').addEventListener('click',()=>manifest?load():initialize());initialize();
})();
