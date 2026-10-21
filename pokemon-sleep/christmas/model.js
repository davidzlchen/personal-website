/* Planning scenario: 2x usual candy EXP, 5x per-candy shards, 500 boosted candy/day. */
(function(root){
'use strict';
const U=typeof module==='object'?require('../upgrades/engine.js'):root.SleepUpgrades;
const I=typeof module==='object'?require('../ingredients/model.js'):root.SleepIngredients;
const rareDex=new Set([144,145,146,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,385,386,480,481,482,483,484,485,486,487,488,489,490,491,492,493]);
function feed(mon,target,levels,{boostCandy=Infinity,boostBelow=Infinity}={}){
    if(!Number.isInteger(target)||target<mon.level||target>levels.cap)throw Error('Target outside the saved level range.');
    const curve=U.curveFor(mon,levels);if(!Number.isInteger(mon.xp_in_level)||mon.xp_in_level<0)throw Error('Saved EXP unavailable.');
    let level=mon.level,progress=mon.xp_in_level,candy=0,boosted=0,shards=0;
    const needed=l=>l===mon.level?mon.xp_level_required:curve[l]-curve[l-1];
    if(level<target&&!(needed(level)>progress))throw Error('Saved EXP does not match the level.');
    while(level<target){
        const boost=boosted<boostCandy&&level<boostBelow;
        shards+=levels.shardsPerCandy[level-1]*(boost?5:1);
        progress+=U.candyXP(level,mon)*(boost?2:1);candy++;if(boost)boosted++;
        while(level<target&&progress>=needed(level)){progress-=needed(level);level++;}
    }
    return {candy,boosted,normal:candy-boosted,shards};
}
function strategies(mon,target,levels,available=0,evolution={}){
    const raw=[{key:'normal',label:'Normal feeding',...feed(mon,target,levels,{boostCandy:0})},{key:'early',label:'Boost below 30, then normal',...feed(mon,target,levels,{boostBelow:30})},{key:'full',label:'Boost to target',...feed(mon,target,levels)}];
    const evolutionCandy=evolution.evolutionCandy||0,stock=Math.max(0,available-evolutionCandy),normal=raw[0];
    if(normal.candy>stock&&raw[2].candy<=stock){
        let lo=0,hi=raw[2].boosted;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(feed(mon,target,levels,{boostCandy:mid}).candy<=stock)hi=mid;else lo=mid+1;}
        raw.push({key:'stretch',label:'Just enough boost for saved candy',...feed(mon,target,levels,{boostCandy:lo})});
    }
    const fixedShards=Math.max(0,(evolution.shards??normal.shards)-normal.shards);
    return raw.map(r=>({...r,shards:r.shards+fixedShards,levelCandy:r.candy,candy:r.candy+evolutionCandy,evolutionCandy,items:{...(evolution.items||{})},conditions:evolution.conditions||[],extraShards:r.shards-normal.shards,candySaved:normal.candy-r.candy,shardsPerCandySaved:normal.candy>r.candy?(r.shards-normal.shards)/(normal.candy-r.candy):null}));
}
function shortlist(roster,data){
    const chosen=new Map(),ingredientRows=data.rows||[];
    const add=(mon,reason)=>{if(!chosen.has(mon.id))chosen.set(mon.id,{id:mon.id,mon,rare:rareDex.has(mon.national_dex),reason,ingredient:mon.specialty==='Ingredients'?mon.ingredients[0]?.name:null});};
    const ingredients=[...new Set(ingredientRows.flatMap(r=>Object.keys(r.projections.at(-1).ingredients)))];
    for(const ingredient of ingredients){
        const ranked=ingredientRows.filter(r=>{const m=roster.find(m=>m.id===r.id);return I.line(m).aaa&&m.ingredients[0].name===ingredient;}).sort((a,b)=>(I.best(b.projections.filter(p=>p.level<=60),ingredient)?.ingredients[ingredient]||0)-(I.best(a.projections.filter(p=>p.level<=60),ingredient)?.ingredients[ingredient]||0));
        for(const row of ranked.slice(0,2)){const m=roster.find(m=>m.id===row.id);add(m,`Top saved AAA ${ingredient} candidate`);}
    }
    for(const mon of roster){
        if(rareDex.has(mon.national_dex))add(mon,'Legendary / mythical: candy is harder to replace');
        else if(mon.specialty==='Skills'&&(mon.favorite||mon.main_skill?.level>=5||mon.subskills.some(s=>s.name==='Skill Trigger M')))add(mon,'Skill build: compare Lv. 25/50 subskill milestones');
        else if(mon.specialty==='Berries'&&mon.subskills.some(s=>s.name==='Berry Finding S')&&(mon.favorite||mon.subskills.some(s=>/Helping Speed|Helping Bonus/.test(s.name))))add(mon,'Berry Finding S plus speed or saved favorite');
    }
    return [...chosen.values()];
}
function variants(candidate,data){
    const row=data.rows.find(r=>r.id===candidate.id),list=[{key:'saved',label:'Saved build',row}];
    const mint=data.mints?.rows.find(r=>r.id===candidate.id)?.plan;if(mint)list.push({key:'mint',label:'Mint first',mint:true,row:mint});
    for(const r of data.seeds?.rows.filter(r=>r.id===candidate.id)||[])list.push({key:r.mint?'mint-seeds':'seeds',label:r.mint?'Mint + subskill seeds':'Subskill seeds',mint:r.mint,seeds:true,row:r.plan});
    return list;
}
function targets(mon,cap){return [...new Set([30,50,60,...(mon.specialty==='Skills'?[25]:[]),...(mon.specialty==='Berries'?[Math.min(mon.level+5,cap)]:[])])].filter(l=>l>mon.level&&l<=cap).sort((a,b)=>a-b);}
function defaultTarget(mon,cap){const ts=targets(mon,cap);if(rareDex.has(mon.national_dex)&&mon.level<30&&ts.includes(30))return 30;return (mon.specialty==='Ingredients'?ts.find(l=>[30,60].includes(l)):mon.specialty==='Skills'?ts.find(l=>[25,50].includes(l)):ts[0])||ts[0]||null;}
function recommend(candidate,target,options,available){
    const {mon,rare}=candidate,normal=options.find(r=>r.key==='normal'),full=options.find(r=>r.key==='full'),early=options.find(r=>r.key==='early'),stretch=options.find(r=>r.key==='stretch');
    if(full.candy>available)return {mode:'full',priority:10,reason:'Save more family candy first; even full boost cannot reach this target with the entered stock.'};
    if(mon.specialty==='Skills'&&mon.level>=50&&!rare)return {mode:'normal',priority:0,reason:'The core skill milestones at 25/50 are already reached. Keep shards for another helper unless this later target has a specific team benefit.'};
    if(rare)return {mode:'full',priority:(mon.level<30?95:70)+(mon.main_skill?.level>=5?10:0),reason:`Reserve boost for rare candy: save ${full.candySaved} candy for ${full.extraShards.toLocaleString('en-US')} extra shards. Review this build before committing; rarity alone does not make it a good investment.`};
    if(mon.level<30)return {mode:target<=30?'full':'early',priority:100,reason:'Use boost while shard prices are low, stopping at Lv. 30. Feed normally after 30 to avoid paying the premium on expensive later levels.'};
    if(stretch)return {mode:'stretch',priority:65,reason:'Use only enough early boosted candy to close the family-candy shortfall, then switch back to normal feeding.'};
    return {mode:'normal',priority:mon.specialty==='Ingredients'?50:40,reason:'Normal feeding reaches this milestone with your entered candy. Keep the boost premium for low-level unlocks and rare candy.'};
}
function ledger(plan,{budget,days,candy,items}){
    const used={shards:0,boosted:0,candy:{},items:{}},issues=[];
    for(const p of plan){used.shards+=p.costs.shards;used.boosted+=p.costs.boosted;used.candy[p.family]=(used.candy[p.family]||0)+p.costs.candy;for(const [name,n] of Object.entries(p.costs.items))used.items[name]=(used.items[name]||0)+n;}
    if(used.shards>budget)issues.push('Shard budget exceeded');if(used.boosted>days*500)issues.push('Shared event boost allowance exceeded');
    for(const [name,n] of Object.entries(used.candy))if(n>(candy[name]??0))issues.push(`${name}: ${n-(candy[name]||0)} more needed`);
    for(const [name,n] of Object.entries(used.items))if(n>(items[name]??0))issues.push(`${name}: ${n-(items[name]||0)} more needed`);
    const schedule=Array.from({length:days},(_,i)=>({day:i+1,total:0,allocations:[]}));let d=0;
    for(const p of plan){let left=p.costs.boosted;while(left&&d<days){const take=Math.min(left,500-schedule[d].total);if(take){schedule[d].total+=take;schedule[d].allocations.push({name:p.name,candy:take});left-=take;}if(schedule[d].total===500)d++;}}
    return {...used,issues,fits:!issues.length,remaining:budget-used.shards,schedule,unscheduled:Math.max(0,used.boosted-days*500)};
}
const api={feed,strategies,shortlist,variants,targets,defaultTarget,recommend,ledger};if(typeof module==='object')module.exports=api;else root.SleepChristmas=api;
})(globalThis);
