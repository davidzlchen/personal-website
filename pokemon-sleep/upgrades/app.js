(function(){
    'use strict';
    const $=id=>document.getElementById(id), make=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
    const params=new URLSearchParams(location.search);
    const labels={strength:'direct Snorlax strength',ingredients:'ingredients',triggers:'skill triggers',shards:'skill Dream Shards'};
    let recipes,plan=[],rotationCache=new Map(),catalog,levels,manifest,inventory,roster,results=[],skipped=[],worker,request=0,limit=12,cap;
    const fmt=(n,metric=$('metric').value)=>n.toLocaleString('en-US',{maximumFractionDigits:['ingredients','triggers'].includes(metric)?1:0});
    const int=n=>n.toLocaleString('en-US');
    function icon(category,name){const path=sleepAssets[category]?.[name];if(!path)return null;const img=make('img');img.src='/pokemon-sleep/assets/'+path;img.alt='';return img;}
    async function json(path){const response=await fetch(path,{cache:'no-cache'});if(!response.ok)throw Error('Data could not be loaded.');return response.json();}
    function url(path,mon){const u=new URL(path,location.origin);if($('snapshot').value)u.searchParams.set('snapshot',$('snapshot').value);u.searchParams.set('island',$('island').value);if(mon)u.searchParams.set('pokemon',mon.id);if(params.get('analytics')==='off')u.searchParams.set('analytics','off');return u.href;}
    function setting(build){const island=$('island').value;return {...SleepAnalyzer.defaultConditions,areaBonus:SleepIslands.savedBonus(island,inventory)||0,favoriteBerry:SleepIslands.favorite(island,build.species.berry)||false};}
    function output(projection){const effect=SleepOutcomes.evaluate(projection.build,projection.result,setting(projection.build));return {effect,strength:effect.directComplete?effect.directStrength:null,ingredients:projection.result.totalIngredients+effect.extraIngredients,triggers:projection.result.triggers,shards:effect.dreamShards};}
    function comparisonText(projection){const o=output(projection);return `${o.strength===null?'Direct strength partially modeled':fmt(o.strength,'strength')+' strength'} · ${fmt(o.ingredients,'ingredients')} ingredients · ${fmt(o.triggers,'triggers')} triggers${o.shards? ' · '+fmt(o.shards,'shards')+' Dream Shards':''} / day`;}
    function settings(){
        return {budget:Math.max(0,Math.min(inventory.dream_shards,Number($('budget').value)||0)),candyReserve:Math.max(0,Math.min(100,Number($('candy-reserve').value)||0)),slots:Number($('slots').value),pot:$('pot').value?Number($('pot').value):null};
    }
    function cachedRotation(pool,recipe,slots,override,level){
        const key=[recipe.id,slots,override?.id||'base',level||0].join('|');
        if(!rotationCache.has(key))rotationCache.set(key,SleepPriorities.rotation(pool,recipe,slots,override));
        return rotationCache.get(key);
    }
    function planningContext(){
        const leads=results.map(r=>{const mon=roster.find(m=>m.id===r.id),projection=r.projections[0];return {id:r.id,name:mon.nickname||mon.species,projection,output:output(projection),utility:SleepPriorities.utility(projection)};});
        const healer=leads.filter(l=>l.utility.kind==='healer').sort((a,b)=>b.utility.value-a.utility.value)[0];
        const config=settings(),pool=results.filter(r=>r.id!==healer?.id).map(r=>({id:r.id,ingredients:r.projections[0].result.ingredients}));
        const candidates=recipes.filter(r=>config.pot===null||r.size<=config.pot);
        const recipe=$('recipe').value==='auto'?(candidates.map(r=>({r,coverage:cachedRotation(pool,r,config.slots)})).sort((a,b)=>b.coverage.meals*b.r.baseStrength-a.coverage.meals*a.r.baseStrength)[0]?.r||recipes[0]):recipes.find(r=>r.id===$('recipe').value);
        const baseline=cachedRotation(pool,recipe,config.slots);

        const best=(key)=>{const lead=leads.filter(l=>l.output[key]!==null).sort((a,b)=>b.output[key]-a.output[key])[0];return {name:lead?.name||'none',value:lead?.output[key]||0};};
        const bestUtility={};for(const kind of ['healer','pot','crit']){const lead=leads.filter(l=>l.utility.kind===kind).sort((a,b)=>b.utility.value-a.utility.value)[0];bestUtility[kind]={name:lead?.name||'none',value:lead?.utility.value||0};}
        const metaRecipes=$('recipe').value==='auto'?SleepPriorities.leadingRecipes(recipes,pool,config.slots,config.pot,r=>cachedRotation(pool,r,config.slots)):[recipe];
        return {pool,recipe,baseline,metaRecipes,slots:config.slots,bestStrength:best('strength'),bestShards:best('shards'),bestUtility,config,rotationFor:row=>cachedRotation(pool,recipe,config.slots,{id:row.mon.id,ingredients:row.p.result.ingredients},row.p.level)};
    }
    function renderAccount(context){
        const {recipe,baseline,config,bestShards,bestUtility}=context;
        $('budget-note').textContent=`Budget: ${int(config.budget)} shards (${(config.budget/inventory.dream_shards*100).toFixed(1)}% of saved balance). Default reserves 80% of shards; keep ${config.candyReserve}% of each candy family. Adjust these guardrails to your goals.`;
        const brief=$('account-brief');brief.replaceChildren(make('span',`Existing healer lead: ${bestUtility.healer.name}`),make('span',`Existing pot support: ${bestUtility.pot.name}`),make('span',`Existing shard lead: ${bestShards.name} · ${fmt(bestShards.value,'shards')} / day`));
        const stock=Object.fromEntries(inventory.entries.filter(e=>e.category==='Ingredients').map(e=>[e.name,e.quantity]));
        const ready=Math.min(...Object.entries(recipe.ingredients).map(([name,amount])=>Math.floor((stock[name]||0)/amount)));
        const box=$('recipe-coverage');box.replaceChildren(make('strong',recipe.name),make('p',`${recipe.size} ingredients per meal · ${baseline.meals.toFixed(2)} / 3 meals per day covered using up to ${config.slots} ingredient slots.`));
        box.append(make('p',`${ready} meals’ worth in the saved ingredient bag. Stock is separate from recurring daily supply; pot access still applies.`));
        if($('recipe').value==='auto')box.append(make('p','This is a Lv. 1 recipe benchmark. Auto priorities examine leading recipes in all categories; each opportunity names the recipe it helps. Select a target to focus on your usual dish.'));
        const ingredients=make('div',undefined,'coverage-ingredients');for(const [name,amount] of Object.entries(recipe.ingredients)){
            const span=make('span'),image=icon('ingredients',name);if(image)span.append(image);
            const lead=context.pool.slice().sort((a,b)=>(b.ingredients[name]||0)-(a.ingredients[name]||0))[0];
            const mon=roster.find(m=>m.id===lead?.id);span.append(make('span',`${name}: bag ${stock[name]||0} · need ${amount*3}/day · best ${fmt(lead?.ingredients[name]||0,'ingredients')} (${mon?.nickname||mon?.species||'none'})`));ingredients.append(span);
        }box.append(ingredients);
        box.append(make('p','Current rotation: '+(baseline.farmers.map(f=>`${roster.find(m=>m.id===f.id)?.nickname||roster.find(m=>m.id===f.id)?.species} ${(f.fraction*100).toFixed(0)}% of a day`).join(' · ')||'No supported ingredient source.')));
        $('pot-note').textContent=config.pot===null?`Pot size unconfirmed. This recipe needs ${recipe.size} slots; check access before spending.`:config.pot<recipe.size?`This recipe needs ${recipe.size} slots; your entered pot has ${config.pot}. Budget for pot expansion or choose a smaller recipe.`:`Fits your entered ${config.pot}-slot pot. Ingredient coverage excludes event boosts.`;
    }
    function renderInvested(peers){
        const box=$('invested');box.replaceChildren();
        const list=peers.filter(p=>SleepPriorities.invested(p.mon,p.current.build.species.specialty)&&p.current.build.species.remainingEvolutions===0).sort((a,b)=>b.mon.level-a.mon.level);
        for(const p of list){const role=p.current.build.species.specialty,line=SleepPriorities.ingredientLine(p.mon),text=`${p.mon.nickname||p.mon.species} · Lv. ${p.mon.level} · `+(role==='ingredient'?`${line.label}: ${p.mon.ingredients.map(i=>i.name).join(' / ')}`:role==='skill'?`${p.current.build.species.effect.name} · main skill Lv. ${p.current.build.skillLevel}`:`${p.current.build.species.berry} · berry specialist`);const item=make('p',text,'muted');box.append(item);}
    }
    function renderPlan(){
        const used=SleepPriorities.ledger(plan,inventory),config=settings(),box=$('plan');box.replaceChildren();
        if(!plan.length)box.append(make('p','No upgrades selected. Keeping your resources is a valid outcome.','muted'));
        for(const item of plan){const mon=roster.find(m=>m.id===item.id),line=make('div',undefined,'plan-item');line.append(make('span',`${mon.nickname||mon.species} → Lv. ${item.level} · ${int(item.costs.shards)} shards · ${int(item.costs.candy)} ${item.family}`));const remove=make('button','Remove');remove.type='button';remove.setAttribute('aria-label',`Remove ${mon.nickname||mon.species} from plan`);remove.addEventListener('click',()=>{plan=plan.filter(p=>p.id!==item.id);render();});line.append(remove);box.append(line);}
        box.append(make('p',`${int(used.shards)} / ${int(config.budget)} shard budget · ${int(used.remaining)} shards left in the account`,'plan-total'));
        for(const [family,amount] of Object.entries(used.candy)){const saved=Object.values(inventory.pokemon_candies).find(c=>c.name===family)?.quantity||0;box.append(make('p',`${family}: ${int(amount)} planned · ${int(saved-amount)} left`,'muted'));}
        if(used.shards>config.budget||plan.some(p=>!SleepPriorities.resources(p.costs,p.family,inventory,config,plan,p.id).fits))box.append(make('p','This plan exceeds the current budget or candy reserve. Remove an upgrade or adjust the guardrails.','plan-warning'));
    }
    function renderCeiling(){
        const metric=$('metric').value,container=$('ceiling');container.replaceChildren();
        const eligible=results.filter(r=>output(r.projections[0])[metric]!==null&&output(r.projections.at(-1))[metric]!==null);
        $('ceiling-note').textContent=`Strongest individual helper by ${labels[metric]}, under the same daily conditions. Possible max uses Lv. ${cap}, ignoring resource limits. This comparison keeps each helper’s existing build.`;
        for(const [label,index] of [['Current theoretical max',0],[`Possible theoretical max · Lv. ${cap}`,-1]]){
            const ranked=eligible.map(r=>({r,p:r.projections.at(index)})).sort((a,b)=>output(b.p)[metric]-output(a.p)[metric]);
            const best=ranked[0], card=make('div',undefined,'ceiling-card');card.append(make('span',label));
            if(best){const mon=roster.find(m=>m.id===best.r.id);card.append(make('strong',fmt(output(best.p)[metric])+' / day'),make('p',`${mon.nickname||mon.species} · ${mon.species} · Lv. ${best.p.level}`));}
            else card.append(make('p','No supported helpers for this comparison.'));
            container.append(card);
        }
    }
    function render(){
        if(!inventory)return;
        $('back').href=url('/pokemon-sleep/');
        const u=new URL(location.href);u.searchParams.set('snapshot',$('snapshot').value);u.searchParams.set('island',$('island').value);u.searchParams.set('metric',$('metric').value);for(const [key,id] of [['recipe','recipe'],['pot','pot'],['budget','budget'],['candy-reserve','candy-reserve'],['slots','slots']]){if($(id).value)u.searchParams.set(key,$(id).value);else u.searchParams.delete(key);}history.replaceState(null,'',u);
        $('island-note').textContent=SleepIslands.note($('island').value,inventory,SleepIslands.savedBonus($('island').value,inventory)||0)+(['custom','greengrass'].includes($('island').value)?' No favorite berries assumed in this view.':'');
        if(!results.length)return;
        $('metric').disabled=$('sort').value==='practical';
        renderCeiling();
        const context=planningContext();renderAccount(context);renderPlan();
        const peers=results.map(r=>({mon:roster.find(m=>m.id===r.id),current:r.projections[0],output:output(r.projections[0])}));
        renderInvested(peers);
        const metric=$('metric').value,search=$('search').value.trim().toLowerCase(),rows=[];
        for(const r of results){
            const mon=roster.find(m=>m.id===r.id);
            if(!`${mon.nickname||''} ${mon.species}`.toLowerCase().includes(search))continue;
            const current=r.projections[0],before=output(current)[metric];
            if(before===null && $('sort').value!=='practical')continue;
            for(const p of r.projections.slice(1)){
                const after=output(p)[metric];if(after===null && $('sort').value!=='practical')continue;
                let costs;try{costs=SleepUpgrades.cost(mon,p.level,levels);}catch{continue;}
                const candy=inventory.pokemon_candies?.[mon.id];
                const resource=SleepPriorities.resources(costs,candy?.name,inventory,context.config,plan,mon.id);
                const affordable=resource.fits;
                if($('affordable').checked&&!affordable)continue;
                const gain=after===null||before===null?0:after-before;
                const row={r,mon,p,current,before,after,gain,costs,candy,affordable,resource,beforeOutput:output(current),afterOutput:output(p),efficiency:gain/costs.shards*10000};
                row.priority=SleepPriorities.assess(row,context);
                row.milestone=SleepPriorities.milestone(row,cap);
                row.fit=SleepPriorities.accountFit(row,peers);
                if($('sort').value==='practical'&&row.milestone.kind==='ingredient'&&!row.fit.line.aaa)continue;
                row.priority.recipe=context.recipe;
                if($('recipe').value==='auto'&&$('sort').value==='practical'){
                    const options=context.metaRecipes.map(recipe=>{
                        const goal={...context,recipe,baseline:cachedRotation(context.pool,recipe,context.slots),rotationFor:candidate=>cachedRotation(context.pool,recipe,context.slots,{id:candidate.mon.id,ingredients:candidate.p.result.ingredients},candidate.p.level)};
                        return {...SleepPriorities.assess(row,goal),recipe};
                    });
                    const useful=options.filter(p=>p.kind==='recipe').sort((a,b)=>b.impact*b.recipe.baseStrength-a.impact*a.recipe.baseStrength);
                    if(useful.length)row.priority=useful[0];
                }
                if(row.priority.kind==='recipe'&&context.config.pot!==null&&context.config.pot<row.priority.recipe.size){row.priority.kind='hold';row.priority.reason='The target recipe does not fit your entered pot size.';}

                if($('sort').value==='practical'){if(row.milestone.kind==='hold')continue;}
                else if(gain<=0 || Number(gain.toFixed(['ingredients','triggers'].includes(metric)?1:0))===0)continue;
                rows.push(row);
            }
        }
        rows.sort((a,b)=>$('sort').value==='practical'?(a.fit.tier-b.fit.tier||b.milestone.quality-a.milestone.quality||a.costs.shards-b.costs.shards):$('sort').value==='cost'?a.costs.shards-b.costs.shards:$('sort').value==='gain'?b.gain-a.gain:b.efficiency-a.efficiency);
        $('count').textContent=`${rows.length} opportunities · ${results.length} of ${roster.length} helpers modeled · ranked by ${$('sort').selectedOptions[0].textContent.toLowerCase()}.`;
        const list=$('opportunities');list.replaceChildren();
        for(const row of rows.slice(0,limit)){
            const {mon,p,r,costs,candy,gain,before,after}=row,card=make('article',undefined,'opportunity');
            const header=make('div',undefined,'opportunity-head');const portrait=make('img');portrait.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${mon.national_dex}.png`;portrait.alt=mon.species;header.append(portrait);
            const title=make('div');title.append(make('h3',mon.nickname||mon.species),make('p',`${mon.species} · Lv. ${mon.level} → ${p.level}`));header.append(title);card.append(header);
            card.append(make('div',SleepUpgrades.unlocks(mon,p.level,cap).join(' · '),'milestone'));
            if($('sort').value==='practical')card.append(make('span',row.milestone.kind==='berry'?'Berry investment':row.milestone.kind==='ingredient'?'Ingredient unlock':'Skill subskill milestone','priority-tag'),make('p',row.milestone.reason,'priority-reason'));
            else card.append(make('span',row.priority.kind==='recipe'?'Recipe bottleneck':row.priority.kind==='hold'?'Defer / review':'Existing role upgrade','priority-tag'),make('p',row.priority.reason,'priority-reason'));
            if($('sort').value==='practical')card.append(make('strong',row.fit.label,'priority-reason'),make('p',row.fit.reason,'resource-share'));
            if(row.milestone.kind==='ingredient')card.append(make('p',`${row.fit.line.label} · ${mon.ingredients.map(i=>i.name).join(' / ')}`,'gain-label'));
            if($('sort').value==='practical'&&row.priority.kind==='recipe')card.append(make('p',row.priority.mealGain>=.02?'+'+row.priority.mealGain.toFixed(2)+' meals / day':row.priority.slotGain.toFixed(2)+' slots freed','gain'),make('p',row.priority.recipe.name,'gain-label'));
            else if($('sort').value!=='practical'&&before!==null&&after!==null)card.append(make('p',(gain>=0?'+':'')+fmt(gain)+' / day','gain'+(gain<0?' negative':'')),make('p',`${labels[metric]} · ${fmt(before)} → ${fmt(after)}${before>0?' ('+(gain>=0?'+':'')+(gain/before*100).toFixed(1)+'%)':''}`,'gain-label'));
            if($('sort').value==='practical'){
                const role=row.milestone.kind;
                const first=role==='berry'?row.beforeOutput.effect.berryStrength:role==='skill'?row.current.result.triggers:row.current.result.totalIngredients;
                const last=role==='berry'?row.afterOutput.effect.berryStrength:role==='skill'?p.result.triggers:p.result.totalIngredients;
                const unit=role==='berry'?'berry Snorlax strength':role==='skill'?'skill triggers':'gathered ingredients';
                const precision=role==='berry'?'strength':role==='skill'?'triggers':'ingredients';
                card.append(make('p',`${fmt(first,precision)} → ${fmt(last,precision)} ${unit} / day`,'gain-label'));
                if(role==='skill')card.append(make('p',`Main skill level ${row.current.build.skillLevel} → ${p.build.skillLevel}`,'gain-label'));
                if(role==='berry'&&mon.subskills.some(s=>s.name==='Helping Bonus'&&s.unlock_level<=p.level))card.append(make('p','Helping Bonus includes this helper’s own 5% speed benefit; benefits to teammates are not counted.','resource-share'));
            }
            const costBox=make('div',undefined,'costs');
            for(const [text,name,value] of [[candy?.name||'Family candy',candy?.name,costs.candy],['Dream Shards','Dream Shards',costs.shards]]){const c=make('span',undefined,'cost');const image=icon('items',name);if(image)c.append(image);c.append(make('span',`${int(value)} ${text}`));costBox.append(c);}card.append(costBox);
            const availability=candy?`${int(candy.quantity)} family candy saved${costs.candy>candy.quantity?' · need '+int(costs.candy-candy.quantity)+' more':''}${costs.shards>inventory.dream_shards?' · need '+int(costs.shards-inventory.dream_shards)+' more shards':''}`:'Family candy unavailable for this helper.';
            card.append(make('p',row.affordable?'Within budget + candy reserve · '+availability:'Save toward this target · '+availability+' · outside current budget or candy reserve','availability'+(row.affordable?'':' short')));
            if(row.priority.kind==='recipe'&&context.config.pot===null)card.append(make('p',`Recipe needs ${row.priority.recipe.size} pot slots; pot access unconfirmed.`,'resource-share'));
            card.append(make('p',`${(row.resource.shardShare*100).toFixed(1)}% of all saved shards · ${Number.isFinite(row.resource.candyShare)?(row.resource.candyShare<=1?(row.resource.candyShare*100).toFixed(1)+'% of this candy family':'needs '+int(costs.candy-(row.resource.saved||0))+' more family candy'):'family candy unavailable'}`,'resource-share'));
            if(row.priority.payback)card.append(make('p',`${Math.ceil(row.priority.payback)} days of additional skill Dream Shards to recover the shard cost, assuming full-time use.`,'resource-share'));
            if(metric==='ingredients'||row.milestone.kind==='ingredient'||row.priority.kind==='recipe'){
                const changes=make('div',undefined,'ingredient-changes');const names=new Set([...Object.keys(row.current.result.ingredients),...Object.keys(p.result.ingredients)]);
                for(const name of names){const span=make('span');const image=icon('ingredients',name);if(image)span.append(image);span.append(make('span',`${name}: ${fmt(row.current.result.ingredients[name]||0,'ingredients')} → ${fmt(p.result.ingredients[name]||0,'ingredients')}`));changes.append(span);}
                const skillBefore=output(row.current).effect.extraIngredients,skillAfter=output(p).effect.extraIngredients;
                if(skillBefore||skillAfter)changes.append(make('span',`Skill ingredients: ${fmt(skillBefore,'ingredients')} → ${fmt(skillAfter,'ingredients')} (mix not assigned)`));
                card.append(changes);
            }
            const details=make('details'),summary=make('summary',`Now, this milestone, and Lv. ${cap}`);details.append(summary,make('p','Now: '+comparisonText(row.current)),make('p',`Lv. ${p.level}: `+comparisonText(p)),make('p',`Lv. ${cap}: `+comparisonText(r.projections.at(-1))));
            if(p.level!==cap){try{const maxCost=SleepUpgrades.cost(mon,cap,levels);details.append(make('p',`To Lv. ${cap}: ${int(maxCost.candy)} candy + ${int(maxCost.shards)} Dream Shards from the saved level.`));}catch{details.append(make('p','Level-cap cost unavailable.'));}}
            details.append(make('p',`${fmt(row.efficiency)} extra ${labels[metric]} per day per 10,000 Dream Shards invested.`));card.append(details);
            const add=make('button',plan.some(item=>item.id===mon.id)?'Update spending plan':'Add to spending plan','add-plan');add.type='button';add.disabled=!row.affordable;add.addEventListener('click',()=>{if(!SleepPriorities.resources(costs,candy?.name,inventory,settings(),plan,mon.id).fits)return;plan=plan.filter(item=>item.id!==mon.id);plan.push({id:mon.id,level:p.level,costs,family:candy.name});render();});card.append(add);
            const link=make('a','View Pokémon details →');link.href=url('/pokemon-sleep/',mon);card.append(link);list.append(card);
        }
        if(!rows.length)list.append(make('p','No eligible specialist milestone matches these filters. Ingredient targets require AAA. Try a raw sort to explore other builds, or turn off the funding filter for longer-term targets.'));
        $('more').hidden=rows.length<=limit;
    }
    async function loadSnapshot(){
        const token=++request;worker?.terminate();results=[];skipped=[];plan=[];rotationCache.clear();limit=12;$('retry').hidden=true;$('workspace').hidden=false;$('ceiling').replaceChildren();$('opportunities').replaceChildren();$('count').textContent='';
        $('load-status').textContent='Loading saved helpers and supplies…';$('load-status').hidden=false;
        try{
            const entry=manifest.snapshots.find(s=>s.id===$('snapshot').value);if(!entry)throw Error('Snapshot unavailable.');
            const paired=await json('/pokemon-sleep/'+entry.file);if(token!==request)return;
            if(paired.roster.captured_at!==entry.captured_at||paired.inventory.captured_at!==entry.captured_at)throw Error('Snapshot dates do not match.');
            roster=paired.roster.records;inventory=paired.inventory;$('budget').value=params.get('budget')??Math.floor(inventory.dream_shards*.2);cap=SleepUpgrades.capForRank(inventory.researcher_rank,levels.cap);
            if(roster.some(m=>m.level>cap))throw Error('Saved research rank and helper levels do not match.');
            $('supplies').textContent=`Saved ${entry.captured_at} · ${int(inventory.dream_shards)} Dream Shards · Research rank ${inventory.researcher_rank} · Trainable cap Lv. ${cap}`;
            render();
            worker=new Worker('worker.js?v=2');
            worker.onmessage=({data})=>{if(token!==request)return;if(data.results){results=data.results;skipped=data.skipped;$('load-status').hidden=true;worker.terminate();$('skipped').textContent=skipped.length?'Excluded helpers: '+skipped.map(s=>`${roster.find(m=>m.id===s.id)?.nickname||roster.find(m=>m.id===s.id)?.species}: ${s.reason}`).join(' · '):'All helpers have supported production projections.';render();if(!results.length){$('load-status').hidden=false;$('load-status').textContent='No helpers have enough supported data to compare.';}}else $('load-status').textContent=`Comparing daily production… ${data.progress} of ${data.total} helpers`;};
            worker.onerror=()=>{if(token!==request)return;worker.terminate();$('load-status').textContent='The comparison could not finish. Retry to calculate again.';$('retry').hidden=false;};
            worker.postMessage({catalog,roster,cap});
        }catch(error){if(token!==request)return;$('workspace').hidden=true;$('load-status').textContent=error.message+' Retry to load this collection.';$('retry').hidden=false;}
    }
    async function initialize(){
        try{
            [catalog,levels,manifest,recipes]=await Promise.all([json('/pokemon-sleep/analyzer/data.json'),json('levels.json'),json('/pokemon-sleep/history.json'),json('recipes.json')]);recipes=recipes.recipes;
            $('recipe').replaceChildren(make('option','Across leading recipes (auto)'));$('recipe').firstElementChild.value='auto';
            for(const recipe of recipes.slice().sort((a,b)=>a.type.localeCompare(b.type)||b.baseStrength-a.baseStrength)){const option=make('option',`${recipe.type} · ${recipe.name} · ${recipe.size} slots`);option.value=recipe.id;$('recipe').append(option);}
            for(const [key,id] of [['recipe','recipe'],['pot','pot'],['candy-reserve','candy-reserve'],['slots','slots']])if(params.has(key))$(id).value=params.get(key);
            $('snapshot').replaceChildren(...manifest.snapshots.map(s=>{const option=make('option',s.captured_at);option.value=s.id;return option;}));
            if(params.has('snapshot')&&!manifest.snapshots.some(s=>s.id===params.get('snapshot')))throw Error('That saved snapshot is unavailable.');
            $('snapshot').value=params.get('snapshot')||manifest.snapshots.at(-1).id;
            SleepIslands.fill($('island'));$('island').value=SleepIslands.get(params.get('island')).id;
            if(Object.hasOwn(labels,params.get('metric')))$('metric').value=params.get('metric');
            await loadSnapshot();
        }catch(error){$('load-status').textContent=error.message;$('retry').hidden=false;}
    }
    $('snapshot').addEventListener('change',loadSnapshot);$('retry').addEventListener('click',()=>manifest?loadSnapshot():initialize());
    for(const id of ['island','metric','sort','affordable','recipe','slots'])$(id).addEventListener('change',()=>{limit=12;render();});
    for(const id of ['pot','budget','candy-reserve'])$(id).addEventListener('input',()=>{limit=12;render();});
    $('search').addEventListener('input',()=>{limit=12;render();});$('more').addEventListener('click',()=>{limit+=12;render();});
    initialize();
})();
