(function(){
    'use strict';
    const $=id=>document.getElementById(id), make=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
    const params=new URLSearchParams(location.search);
    const labels={strength:'direct Snorlax strength',ingredients:'ingredients',triggers:'skill triggers',shards:'skill Dream Shards'};
    let catalog,levels,manifest,inventory,roster,results=[],skipped=[],worker,request=0,limit=12,cap;
    const fmt=(n,metric=$('metric').value)=>n.toLocaleString('en-US',{maximumFractionDigits:['ingredients','triggers'].includes(metric)?1:0});
    const int=n=>n.toLocaleString('en-US');
    function icon(category,name){const path=sleepAssets[category]?.[name];if(!path)return null;const img=make('img');img.src='/pokemon-sleep/assets/'+path;img.alt='';return img;}
    async function json(path){const response=await fetch(path,{cache:'no-cache'});if(!response.ok)throw Error('Data could not be loaded.');return response.json();}
    function url(path,mon){const u=new URL(path,location.origin);if($('snapshot').value)u.searchParams.set('snapshot',$('snapshot').value);u.searchParams.set('island',$('island').value);if(mon)u.searchParams.set('pokemon',mon.id);if(params.get('analytics')==='off')u.searchParams.set('analytics','off');return u.href;}
    function setting(build){const island=$('island').value;return {...SleepAnalyzer.defaultConditions,areaBonus:SleepIslands.savedBonus(island,inventory)||0,favoriteBerry:SleepIslands.favorite(island,build.species.berry)||false};}
    function output(projection){const effect=SleepOutcomes.evaluate(projection.build,projection.result,setting(projection.build));return {effect,strength:effect.directComplete?effect.directStrength:null,ingredients:projection.result.totalIngredients+effect.extraIngredients,triggers:projection.result.triggers,shards:effect.dreamShards};}
    function comparisonText(projection){const o=output(projection);return `${o.strength===null?'Direct strength partially modeled':fmt(o.strength,'strength')+' strength'} · ${fmt(o.ingredients,'ingredients')} ingredients · ${fmt(o.triggers,'triggers')} triggers${o.shards? ' · '+fmt(o.shards,'shards')+' Dream Shards':''} / day`;}
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
        const u=new URL(location.href);u.searchParams.set('snapshot',$('snapshot').value);u.searchParams.set('island',$('island').value);u.searchParams.set('metric',$('metric').value);history.replaceState(null,'',u);
        $('island-note').textContent=SleepIslands.note($('island').value,inventory,SleepIslands.savedBonus($('island').value,inventory)||0)+(['custom','greengrass'].includes($('island').value)?' No favorite berries assumed in this view.':'');
        if(!results.length)return;
        renderCeiling();
        const metric=$('metric').value,search=$('search').value.trim().toLowerCase(),rows=[];
        for(const r of results){
            const mon=roster.find(m=>m.id===r.id);
            if(!`${mon.nickname||''} ${mon.species}`.toLowerCase().includes(search))continue;
            const current=r.projections[0],before=output(current)[metric];
            if(before===null)continue;
            for(const p of r.projections.slice(1)){
                const after=output(p)[metric];if(after===null)continue;
                let costs;try{costs=SleepUpgrades.cost(mon,p.level,levels);}catch{continue;}
                const candy=inventory.pokemon_candies?.[mon.id];
                const affordable=candy&&candy.quantity>=costs.candy&&inventory.dream_shards>=costs.shards;
                if($('affordable').checked&&!affordable)continue;
                const gain=after-before;
                if(gain<=0 || Number(gain.toFixed(['ingredients','triggers'].includes(metric)?1:0))===0)continue;
                rows.push({r,mon,p,current,before,after,gain,costs,candy,affordable,efficiency:gain/costs.shards*10000});
            }
        }
        rows.sort((a,b)=>$('sort').value==='cost'?a.costs.shards-b.costs.shards:$('sort').value==='gain'?b.gain-a.gain:b.efficiency-a.efficiency);
        $('count').textContent=`${rows.length} opportunities · ${results.length} of ${roster.length} helpers modeled · ranked by ${$('sort').selectedOptions[0].textContent.toLowerCase()}.`;
        const list=$('opportunities');list.replaceChildren();
        for(const row of rows.slice(0,limit)){
            const {mon,p,r,costs,candy,gain,before,after}=row,card=make('article',undefined,'opportunity');
            const header=make('div',undefined,'opportunity-head');const portrait=make('img');portrait.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${mon.national_dex}.png`;portrait.alt=mon.species;header.append(portrait);
            const title=make('div');title.append(make('h3',mon.nickname||mon.species),make('p',`${mon.species} · Lv. ${mon.level} → ${p.level}`));header.append(title);card.append(header);
            card.append(make('div',SleepUpgrades.unlocks(mon,p.level,cap).join(' · '),'milestone'));
            card.append(make('p',(gain>=0?'+':'')+fmt(gain)+' / day','gain'+(gain<0?' negative':'')),make('p',`${labels[metric]} · ${fmt(before)} → ${fmt(after)}${before>0?' ('+(gain>=0?'+':'')+(gain/before*100).toFixed(1)+'%)':''}`,'gain-label'));
            const costBox=make('div',undefined,'costs');
            for(const [text,name,value] of [[candy?.name||'Family candy',candy?.name,costs.candy],['Dream Shards','Dream Shards',costs.shards]]){const c=make('span',undefined,'cost');const image=icon('items',name);if(image)c.append(image);c.append(make('span',`${int(value)} ${text}`));costBox.append(c);}card.append(costBox);
            const availability=candy?`${int(candy.quantity)} family candy saved${costs.candy>candy.quantity?' · need '+int(costs.candy-candy.quantity)+' more':''}${costs.shards>inventory.dream_shards?' · need '+int(costs.shards-inventory.dream_shards)+' more shards':''}`:'Family candy unavailable for this helper.';
            card.append(make('p',row.affordable?'Within saved supplies · '+availability:availability,'availability'+(row.affordable?'':' short')));
            if(metric==='ingredients'){
                const changes=make('div',undefined,'ingredient-changes');const names=new Set([...Object.keys(row.current.result.ingredients),...Object.keys(p.result.ingredients)]);
                for(const name of names){const span=make('span');const image=icon('ingredients',name);if(image)span.append(image);span.append(make('span',`${name}: ${fmt(row.current.result.ingredients[name]||0,'ingredients')} → ${fmt(p.result.ingredients[name]||0,'ingredients')}`));changes.append(span);}
                const skillBefore=output(row.current).effect.extraIngredients,skillAfter=output(p).effect.extraIngredients;
                if(skillBefore||skillAfter)changes.append(make('span',`Skill ingredients: ${fmt(skillBefore,'ingredients')} → ${fmt(skillAfter,'ingredients')} (mix not assigned)`));
                card.append(changes);
            }
            const details=make('details'),summary=make('summary',`Now, this milestone, and Lv. ${cap}`);details.append(summary,make('p','Now: '+comparisonText(row.current)),make('p',`Lv. ${p.level}: `+comparisonText(p)),make('p',`Lv. ${cap}: `+comparisonText(r.projections.at(-1))));
            if(p.level!==cap){try{const maxCost=SleepUpgrades.cost(mon,cap,levels);details.append(make('p',`To Lv. ${cap}: ${int(maxCost.candy)} candy + ${int(maxCost.shards)} Dream Shards from the saved level.`));}catch{details.append(make('p','Level-cap cost unavailable.'));}}
            details.append(make('p',`${fmt(row.efficiency)} extra ${labels[metric]} per day per 10,000 Dream Shards invested.`));card.append(details);
            const link=make('a','View Pokémon details →');link.href=url('/pokemon-sleep/',mon);card.append(link);list.append(card);
        }
        if(!rows.length)list.append(make('p','No opportunities match these filters. Try another metric or include helpers needing more supplies.'));
        $('more').hidden=rows.length<=limit;
    }
    async function loadSnapshot(){
        const token=++request;worker?.terminate();results=[];skipped=[];limit=12;$('retry').hidden=true;$('workspace').hidden=false;$('ceiling').replaceChildren();$('opportunities').replaceChildren();$('count').textContent='';
        $('load-status').textContent='Loading saved helpers and supplies…';$('load-status').hidden=false;
        try{
            const entry=manifest.snapshots.find(s=>s.id===$('snapshot').value);if(!entry)throw Error('Snapshot unavailable.');
            const paired=await json('/pokemon-sleep/'+entry.file);if(token!==request)return;
            if(paired.roster.captured_at!==entry.captured_at||paired.inventory.captured_at!==entry.captured_at)throw Error('Snapshot dates do not match.');
            roster=paired.roster.records;inventory=paired.inventory;cap=SleepUpgrades.capForRank(inventory.researcher_rank,levels.cap);
            if(roster.some(m=>m.level>cap))throw Error('Saved research rank and helper levels do not match.');
            $('supplies').textContent=`Saved ${entry.captured_at} · ${int(inventory.dream_shards)} Dream Shards · Research rank ${inventory.researcher_rank} · Trainable cap Lv. ${cap}`;
            render();
            worker=new Worker('worker.js?v=1');
            worker.onmessage=({data})=>{if(token!==request)return;if(data.results){results=data.results;skipped=data.skipped;$('load-status').hidden=true;worker.terminate();$('skipped').textContent=skipped.length?'Excluded helpers: '+skipped.map(s=>`${roster.find(m=>m.id===s.id)?.nickname||roster.find(m=>m.id===s.id)?.species}: ${s.reason}`).join(' · '):'All helpers have supported production projections.';render();if(!results.length){$('load-status').hidden=false;$('load-status').textContent='No helpers have enough supported data to compare.';}}else $('load-status').textContent=`Comparing daily production… ${data.progress} of ${data.total} helpers`;};
            worker.onerror=()=>{if(token!==request)return;worker.terminate();$('load-status').textContent='The comparison could not finish. Retry to calculate again.';$('retry').hidden=false;};
            worker.postMessage({catalog,roster,cap});
        }catch(error){if(token!==request)return;$('workspace').hidden=true;$('load-status').textContent=error.message+' Retry to load this collection.';$('retry').hidden=false;}
    }
    async function initialize(){
        try{
            [catalog,levels,manifest]=await Promise.all([json('/pokemon-sleep/analyzer/data.json'),json('levels.json'),json('/pokemon-sleep/history.json')]);
            $('snapshot').replaceChildren(...manifest.snapshots.map(s=>{const option=make('option',s.captured_at);option.value=s.id;return option;}));
            if(params.has('snapshot')&&!manifest.snapshots.some(s=>s.id===params.get('snapshot')))throw Error('That saved snapshot is unavailable.');
            $('snapshot').value=params.get('snapshot')||manifest.snapshots.at(-1).id;
            SleepIslands.fill($('island'));$('island').value=SleepIslands.get(params.get('island')).id;
            if(Object.hasOwn(labels,params.get('metric')))$('metric').value=params.get('metric');
            await loadSnapshot();
        }catch(error){$('load-status').textContent=error.message;$('retry').hidden=false;}
    }
    $('snapshot').addEventListener('change',loadSnapshot);$('retry').addEventListener('click',()=>manifest?loadSnapshot():initialize());
    for(const id of ['island','metric','sort','affordable'])$(id).addEventListener('change',()=>{limit=12;render();});
    $('search').addEventListener('input',()=>{limit=12;render();});$('more').addEventListener('click',()=>{limit+=12;render();});
    initialize();
})();
