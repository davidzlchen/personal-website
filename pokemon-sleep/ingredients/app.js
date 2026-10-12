(function(){
    'use strict';
    const $=id=>document.getElementById(id),make=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
    const params=new URLSearchParams(location.search),fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:1}),int=n=>n.toLocaleString('en-US');
    let catalog,levels,manifest,roster=[],inventory,rows=[],references=[],excluded=[],worker,request=0,cap,total=0;
    async function json(path){const response=await fetch(path,{cache:'no-cache'});if(!response.ok)throw Error('Data could not be loaded.');return response.json();}
    function icon(name){const path=sleepAssets.ingredients?.[name];if(!path)return null;const img=make('img');img.src='/pokemon-sleep/assets/'+path;img.alt='';return img;}
    function portrait(dex,name){const img=make('img');img.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dex}.png`;img.alt=name;img.loading='lazy';return img;}
    function name(mon){return mon.nickname||mon.species;}
    function filters(){return {aaa:$('aaa').checked,evolutions:$('evolutions').checked,sort:$('sort').value};}
    function options(ingredient){return SleepIngredients.candidates(rows,roster,ingredient,filters());}
    function link(path,mon){const u=new URL(path,location.origin);u.searchParams.set('snapshot',$('snapshot').value);if(params.has('island'))u.searchParams.set('island',params.get('island'));if(mon)u.searchParams.set('pokemon',mon.id);if(params.get('analytics')==='off')u.searchParams.set('analytics','off');return u.href;}
    function leaders(list,ingredient){return {now:list.filter(r=>(r.current.ingredients[ingredient]||0)>0).sort((a,b)=>(b.current.ingredients[ingredient]||0)-(a.current.ingredients[ingredient]||0))[0],potential:list.slice().sort((a,b)=>b.peak.ingredients[ingredient]-a.peak.ingredients[ingredient])[0]};}
    function renderOverview(){
        const box=$('overview');box.replaceChildren();
        for(const ingredient of Array.from($('ingredient').options).map(o=>o.value)){
            const lead=leaders(options(ingredient),ingredient),button=make('button',undefined,'ingredient-tile');button.type='button';button.setAttribute('aria-pressed',String(ingredient===$('ingredient').value));
            const title=make('strong');const img=icon(ingredient);if(img)title.append(img);title.append(make('span',ingredient));button.append(title);
            button.append(make('span',lead.now?`Now: ${name(lead.now.mon)} · ${fmt(lead.now.current.ingredients[ingredient])}/day`:'Now: no matching producer.'),make('span',lead.potential?`Potential: ${name(lead.potential.mon)} · ${fmt(lead.potential.peak.ingredients[ingredient])}/day at ${lead.potential.peak.level}`:'No saved build matches these filters.'));
            button.addEventListener('click',()=>{$('ingredient').value=ingredient;$('search').value='';render();$('selected-heading').scrollIntoView({behavior:'smooth',block:'start'});});box.append(button);
        }
    }
    function costsBlock(mon,p){
        const box=make('div',undefined,'candidate-costs'),candy=inventory.pokemon_candies?.[mon.id];
        if(!p.costs){box.append(make('p','Resource cost unavailable: '+(p.costError||'Saved EXP unavailable.'),'availability short'));return box;}
        const costs=make('div',undefined,'costs');for(const [amount,label] of [[p.costs.candy,candy?.name||'Family candy'],[p.costs.shards,'Dream Shards']]){
            const span=make('span',undefined,'cost'),path=sleepAssets.items?.[label];if(path){const img=make('img');img.src='/pokemon-sleep/assets/'+path;img.alt='';span.append(img);}span.append(make('span',`${int(amount)} ${label}`));costs.append(span);
        }box.append(costs);
        const resource=SleepIngredients.resources(p.costs,candy,inventory);
        const enough=resource.candyShort===0&&resource.shardShort===0;
        box.append(make('p',p.costs.candy===0&&p.costs.shards===0?'Already reached · no additional candy or shards.':enough?'Within saved family candy and shard balances.':`Still needed: ${resource.candyShort===null?'family candy balance unknown':int(resource.candyShort)+' family candy'} · ${int(resource.shardShort)} Dream Shards.`,'availability'+(enough?'':' short')));
        if(candy)box.append(make('p',`Saved ${int(candy.quantity)} ${candy.name}; costs are incremental from Lv. ${mon.level}.`,'muted'));
        return box;
    }
    function renderCandidates(){
        const ingredient=$('ingredient').value,all=options(ingredient),lead=leaders(all,ingredient),search=$('search').value.trim().toLowerCase();
        const list=all.filter(r=>`${name(r.mon)} ${r.mon.species}`.toLowerCase().includes(search));
        const heading=$('ingredient-heading');heading.replaceChildren();const img=icon(ingredient);if(img)heading.append(img);heading.append(make('span',ingredient));
        const top=$('leaders');top.replaceChildren();
        for(const [title,r,p] of [['Best now',lead.now,lead.now?.current],['Highest saved-build potential',lead.potential,lead.potential?.peak]]){
            const card=make('div',undefined,'ceiling-card');card.append(make('span',title));
            if(r)card.append(make('strong',`${fmt(p.ingredients[ingredient]||0)} / day`),make('p',`${name(r.mon)} · ${r.mon.species} · Lv. ${p.level}`));else card.append(make('p','No matching saved producer.'));
            top.append(card);
        }
        $('count').textContent=`${list.length} saved candidates · ${rows.length} of ${total} ingredient specialists modeled · cap Lv. ${cap}.`;
        const box=$('candidates');box.replaceChildren();
        for(const r of list){
            const {mon,peak,current}=r,card=make('article',undefined,'opportunity');
            const head=make('div',undefined,'opportunity-head'),title=make('div');title.append(make('h3',name(mon)),make('p',`${mon.species} · saved Lv. ${mon.level}${r.remainingEvolutions?' · unevolved':''}`));head.append(portrait(mon.national_dex,mon.species),title);card.append(head);
            card.append(make('p',`${r.line.aaa?'AAA':'Mixed line'} · ${mon.nature_neutralized?'neutralized nature':mon.nature}`,'candidate-meta'));
            const line=make('div',undefined,'ingredient-line');mon.ingredients.forEach((s,i)=>{const span=make('span'),image=icon(s.name);if(image)span.append(image);span.append(make('span',`${[1,30,60][i]}: ${s.name} ×${s.quantity}`));line.append(span);});card.append(line);
            card.append(make('p',`Now: ${fmt(current.ingredients[ingredient]||0)} ${ingredient}/day`,'candidate-current'),make('p',`${fmt(peak.ingredients[ingredient])} / day`,'gain'),make('p',`Highest modeled ${ingredient} · Lv. ${peak.level} · +${fmt(peak.ingredients[ingredient]-(current.ingredients[ingredient]||0))}/day`,'gain-label'));
            card.append(costsBlock(mon,peak));
            if(r.limitation)card.append(make('p',r.limitation+' Maximum is limited to confirmed saved data.','availability short'));
            if(r.remainingEvolutions)card.append(make('p','Current-form projection. Evolve before comparing this with final-form farmers; evolution costs and output are not included.','availability short'));
            const detail=make('details');detail.append(make('summary','Ingredient milestones and resource costs'));
            const table=make('table',undefined,'milestone-table'),caption=make('caption',`${ingredient} per day; costs from saved level`);table.append(caption);
            const header=make('tr');for(const text of ['Level','Per day','Candy','Shards'])header.append(make('th',text));const thead=make('thead');thead.append(header);table.append(thead);
            const tbody=make('tbody');for(const level of [...new Set([mon.level,30,60,cap,peak.level])].sort((a,b)=>a-b)){
                if(level<mon.level||level>cap)continue;
                const p=SleepIngredients.at(r.projections,level),tr=make('tr');for(const text of [String(level),p?fmt(p.ingredients[ingredient]||0):'Unknown',p?.costs?int(p.costs.candy):'Unknown',p?.costs?int(p.costs.shards):'Unknown'])tr.append(make('td',text));tbody.append(tr);
            }table.append(tbody);detail.append(table);card.append(detail);
            const subskills=make('p',mon.subskills.filter(s=>s.unlock_level<=peak.level).map(s=>`${s.unlock_level}: ${s.name}`).join(' · '),'candidate-meta');card.append(subskills);
            const a=make('a','View saved Pokémon →');a.href=link('/pokemon-sleep/',mon);card.append(a);box.append(card);
        }
        if(!list.length){box.append(make('p','No saved ingredient specialist matches these filters.'));if($('aaa').checked){const button=make('button','Show mixed ingredient lines','add-plan');button.type='button';button.addEventListener('click',()=>{$('aaa').checked=false;render();});box.append(button);}}
    }
    function renderReference(){
        const ingredient=$('ingredient').value,list=references.filter(r=>r.ingredient===ingredient&&(!$('aaa').checked||r.aaa)).sort((a,b)=>b.amount-a.amount),box=$('reference');box.replaceChildren();$('reference-cap').textContent=String(cap);
        for(const r of list){const card=make('article',undefined,'reference-card'),body=make('div');card.append(portrait(r.dex,r.name));body.append(make('strong',r.name),make('p',`${fmt(r.amount)} ${ingredient}/day`,'reference-output'),make('p',`${r.aaa?'AAA':'Mixed'} · ${r.line.join(' / ')}`));
            const saved=roster.filter(m=>SleepAnalyzer.matchSpecies(catalog,m)?.key===r.key);body.append(make('p',saved.length?`You have ${saved.length} saved ${r.name}. The benchmark changes nature/subskills; its build is not priced as a level-only upgrade.`:'Not in your saved collection. Catch/evolve first; resource cost depends on the actual saved build.'));card.append(body);box.append(card);
        }
        if(!list.length)box.append(make('p','No supported final-form species matches this ingredient and line filter. Uncheck AAA to see mixed-line sources.'));
    }
    function render(){
        const u=new URL(location.href);u.searchParams.set('snapshot',$('snapshot').value);u.searchParams.set('ingredient',$('ingredient').value);u.searchParams.set('aaa',String($('aaa').checked));u.searchParams.set('evolutions',String($('evolutions').checked));u.searchParams.set('sort',$('sort').value);history.replaceState(null,'',u);
        $('back').href=link('/pokemon-sleep/');$('upgrades').href=link('/pokemon-sleep/upgrades/');
        if(!$('results').hidden){renderOverview();renderCandidates();renderReference();}
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
            worker=new Worker('worker.js?v=1');worker.onmessage=({data})=>{
                if(token!==request)return;
                if(data.error){worker.terminate();$('status').textContent=data.error;$('retry').hidden=false;}
                else if(data.rows){({rows,references,excluded,total}=data);worker.terminate();$('results').hidden=false;$('status').hidden=true;$('limitations').textContent=excluded.length?'Unmodeled saved helpers: '+excluded.map(r=>`${name(roster.find(m=>m.id===r.id))}: ${r.reason}`).join(' · '):'Every saved ingredient specialist has supported current production.';render();}
                else $('status').textContent='Calculating… '+data.progress;
            };worker.onerror=()=>{if(token!==request)return;worker.terminate();$('status').textContent='The calculation could not finish. Retry to calculate again.';$('retry').hidden=false;};worker.postMessage({catalog,roster,cap,levels});
        }catch(error){if(token!==request)return;$('status').textContent=error.message;$('retry').hidden=false;}
    }
    async function initialize(){try{
        [catalog,levels,manifest]=await Promise.all([json('/pokemon-sleep/analyzer/data.json'),json('/pokemon-sleep/upgrades/levels.json'),json('/pokemon-sleep/history.json')]);
        const ingredients=[...new Set(catalog.species.filter(p=>p.specialty==='ingredient').flatMap(p=>p.ingredients.flat().map(s=>s.name)))].sort();
        $('ingredient').replaceChildren(...ingredients.map(n=>{const option=make('option',n);option.value=n;return option;}));
        if(params.has('ingredient')&&!ingredients.includes(params.get('ingredient')))throw Error('That ingredient is unavailable in the catalog.');
        $('ingredient').value=params.get('ingredient')||'Warming Ginger';
        $('snapshot').replaceChildren(...manifest.snapshots.map(s=>{const option=make('option',s.captured_at);option.value=s.id;return option;}));
        if(params.has('snapshot')&&!manifest.snapshots.some(s=>s.id===params.get('snapshot')))throw Error('That saved collection is unavailable.');
        $('snapshot').value=params.get('snapshot')||manifest.snapshots.at(-1).id;
        if(params.has('aaa'))$('aaa').checked=params.get('aaa')!=='false';if(params.has('evolutions'))$('evolutions').checked=params.get('evolutions')==='true';if(['max','current','cost'].includes(params.get('sort')))$('sort').value=params.get('sort');await load();
    }catch(error){$('status').textContent=error.message;$('retry').hidden=false;}}
    $('snapshot').addEventListener('change',load);for(const id of ['ingredient','aaa','evolutions','sort'])$(id).addEventListener('change',render);$('search').addEventListener('input',render);$('retry').addEventListener('click',()=>manifest?load():initialize());initialize();
})();
