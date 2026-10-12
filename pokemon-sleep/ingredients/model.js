/* Ingredient comparisons reuse the saved-build production and candy engines. */
(function(root){
    'use strict';
    const A=typeof module==='object'?require('../analyzer/engine.js'):root.SleepAnalyzer;
    const U=typeof module==='object'?require('../upgrades/engine.js'):root.SleepUpgrades;
    function line(mon){
        const names=(mon.ingredients||[]).map(i=>i?.empty?null:i?.name);
        return {aaa:names.length===3&&names.every(n=>n&&n===names[0]),names};
    }
    function best(projections,name){
        return projections.filter(p=>(p.ingredients[name]||0)>0).reduce((lead,p)=>!lead||(p.ingredients[name]||0)>(lead.ingredients[name]||0)?p:lead,null);
    }
    function at(projections,level){return projections.find(p=>p.level===level)||null;}
    function candidates(rows,roster,name,{aaa=true,evolutions=true,sort='max'}={}){
        return rows.map(r=>{const mon=roster.find(m=>m.id===r.id),current=r.projections[0],peak=best(r.projections,name);return {...r,mon,current,peak,line:line(mon)};})
            .filter(r=>r.peak&&(!aaa||r.line.aaa)&&(evolutions||r.remainingEvolutions===0))
            .sort((a,b)=>sort==='current'?(b.current.ingredients[name]||0)-(a.current.ingredients[name]||0):sort==='cost'?(a.peak.costs?.shards??Infinity)-(b.peak.costs?.shards??Infinity):(b.peak.ingredients[name]||0)-(a.peak.ingredients[name]||0));
    }
    function owned(catalog,mon,cap,levels,simulate=A.simulate){
        const species=A.matchSpecies(catalog,mon);
        if(!species||species.specialty!=='ingredient')return null;
        const projections=[];let limitation=null;
        for(let level=mon.level;level<=cap;level++){
            let build;try{build=U.project(catalog,mon,level);}catch(error){limitation=`From Lv. ${level}: ${error.message}`;break;}
            const result=simulate(build,A.defaultConditions);
            let costs=null,costError=null;try{costs=level===mon.level?{candy:0,shards:0}:U.cost(mon,level,levels);}catch(error){costError=error.message;}
            projections.push({level,ingredients:result.ingredients,costs,costError});
        }
        if(!projections.length)throw Error(limitation||'Saved production unavailable.');
        return {id:mon.id,remainingEvolutions:species.remainingEvolutions,projections,limitation};
    }
    // Shared, explicit benchmark rather than a claim to optimize every legal build.
    function referenceBuild(catalog,species,name,cap,aaa=true){
        if(species.specialty!=='ingredient'||species.remainingEvolutions!==0)return null;
        const ingredients=species.ingredients.map(slots=>slots.find(s=>s.name===name)||slots.slice().sort((a,b)=>a.quantity-b.quantity)[0]);
        if(!ingredients.every(Boolean)||!ingredients.some(s=>s.name===name)||(aaa&&!ingredients.every(s=>s.name===name)))return null;
        return {species,level:cap,carry:species.carry,nature:catalog.natures.find(n=>n.name==='Quiet'),ingredients,
            subskills:[{name:'Ingredient Finder M',unlock:10},{name:'Ingredient Finder S',unlock:25},{name:'Helping Speed M',unlock:50},{name:'Helping Speed S',unlock:70},{name:'Helping Bonus',unlock:80}],skillLevel:1};
    }
    function resources(costs,candy,inventory){
        if(!costs)return null;
        return {candyShort:candy&&Number.isFinite(candy.quantity)?Math.max(0,costs.candy-candy.quantity):null,shardShort:Math.max(0,costs.shards-inventory.dream_shards)};
    }
    const api={line,best,at,candidates,owned,referenceBuild,resources};
    if(typeof module==='object')module.exports=api;else root.SleepIngredients=api;
})(globalThis);
