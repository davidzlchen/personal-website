/* Ingredient comparisons reuse the saved-build production and candy engines. */
(function(root){
    'use strict';
    const A=typeof module==='object'?require('../analyzer/engine.js'):root.SleepAnalyzer;
    const U=typeof module==='object'?require('../upgrades/engine.js'):root.SleepUpgrades;
    const E=typeof module==='object'?require('./evolutions.json'):null;
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
    function paths(catalog,start,cap,evolutions=E){
        const all=[];
        function visit(species,steps,minLevel,seen){
            all.push({species,steps,minLevel});
            for(const edge of evolutions?.edges||[]){
                if(edge.from!==species.key||seen.has(edge.to))continue;
                const next=catalog.species.find(p=>p.key===edge.to),minimum=Math.max(minLevel,edge.minLevel);
                if(next&&minimum<=cap)visit(next,[...steps,edge],minimum,new Set([...seen,edge.to]));
            }
        }
        visit(start,[],1,new Set([start.key]));return all;
    }
    function projectEvolution(catalog,mon,level,path,evolutions=E){
        const build=U.project(catalog,mon,level),species=path.species;
        build.species=species;
        // v2.9: the +5 per evolutionary stage applies even to wild evolved catches.
        build.carry=species.carry+5*(evolutions?.previousEvolutions?.[species.key]||0);
        build.ingredients=[1,30,60].map((unlock,i)=>{
            if(level<unlock)return species.ingredients[i][0];
            const slot=species.ingredients[i].find(s=>s.name===mon.ingredients[i]?.name);
            if(!slot)throw Error('Saved ingredient identity is unavailable in the evolved form.');return slot;
        });
        const extra=mon.subskills.filter(s=>s.unlock_level>mon.level&&s.unlock_level<=level).reduce((n,s)=>n+(s.name==='Skill Level Up S'?1:s.name==='Skill Level Up M'?2:0),0);
        build.skillLevel=mon.main_skill?.level===null||mon.main_skill?.level===undefined?null:Math.min(species.effect.maxLevel,mon.main_skill.level+extra+path.steps.length);
        return build;
    }
    function evolutionCost(mon,level,levels,steps){
        const base=level===mon.level?{candy:0,shards:0}:U.cost(mon,level,levels),items={},conditions=[];
        let candy=0,shards=0;
        for(const step of steps){candy+=step.candy;shards+=step.shards;for(const [name,n] of Object.entries(step.items))items[name]=(items[name]||0)+n;conditions.push(...step.conditions);}
        return {candy:base.candy+candy,shards:base.shards+shards,levelCandy:base.candy,evolutionCandy:candy,items,conditions:[...new Set(conditions)]};
    }
    function owned(catalog,mon,cap,levels,simulate=A.simulate,evolutions=E){
        const species=A.matchSpecies(catalog,mon);
        if(!species||species.specialty!=='ingredient')return null;
        const projections=[],evolutionPaths=[];let limitation=null;
        for(const path of paths(catalog,species,cap,evolutions)){
            const form={key:path.species.key,name:path.species.name,dex:path.species.dex};
            evolutionPaths.push({form,minLevel:Math.max(mon.level,path.minLevel),steps:path.steps});
            for(let level=Math.max(mon.level,path.minLevel);level<=cap;level++){
                let build;try{build=projectEvolution(catalog,mon,level,path,evolutions);}catch(error){limitation=`${form.name}, from Lv. ${level}: ${error.message}`;break;}
                const result=simulate(build,A.defaultConditions);
                let costs=null,costError=null;try{costs=evolutionCost(mon,level,levels,path.steps);}catch(error){costError=error.message;}
                projections.push({level,form,steps:path.steps,ingredients:result.ingredients,costs,costError,carry:build.carry,skillLevel:build.skillLevel});
            }
        }
        if(!projections.length)throw Error(limitation||'Saved production unavailable.');
        if(species.remainingEvolutions>0&&evolutionPaths.length===1)limitation=limitation||'No verified supported evolution path is available; current-form results only.';
        return {id:mon.id,remainingEvolutions:species.remainingEvolutions,projections,evolutionPaths,limitation};
    }
    function milestones(row,name,cap){
        const levels=new Set([row.projections[0].level,30,60,cap,best(row.projections,name)?.level,...row.evolutionPaths.map(p=>p.minLevel)]);
        const rows=[row.projections[0],...[...levels].sort((a,b)=>a-b).map(level=>best(row.projections.filter(p=>p.level===level),name)).filter(Boolean)];
        return rows.filter((p,i)=>rows.findIndex(q=>q.level===p.level&&q.form.key===p.form.key)===i).sort((a,b)=>a.level-b.level||(a.costs?.candy??Infinity)-(b.costs?.candy??Infinity));
    }
    // Shared, explicit benchmark rather than a claim to optimize every legal build.
    function referenceBuild(catalog,species,name,cap,aaa=true,evolutions=E){
        if(species.specialty!=='ingredient'||species.remainingEvolutions!==0)return null;
        const ingredients=species.ingredients.map(slots=>slots.find(s=>s.name===name)||slots.slice().sort((a,b)=>a.quantity-b.quantity)[0]);
        if(!ingredients.every(Boolean)||!ingredients.some(s=>s.name===name)||(aaa&&!ingredients.every(s=>s.name===name)))return null;
        return {species,level:cap,carry:species.carry+5*(evolutions?.previousEvolutions?.[species.key]||0),nature:catalog.natures.find(n=>n.name==='Quiet'),ingredients,
            subskills:[{name:'Ingredient Finder M',unlock:10},{name:'Ingredient Finder S',unlock:25},{name:'Helping Speed M',unlock:50},{name:'Helping Speed S',unlock:70},{name:'Helping Bonus',unlock:80}],skillLevel:1};
    }
    function resources(costs,candy,inventory){
        if(!costs)return null;
        const itemShort=Object.entries(costs.items||{}).map(([name,quantity])=>({name,quantity,needed:Array.isArray(inventory.entries)?Math.max(0,quantity-inventory.entries.filter(e=>e.name===name).reduce((n,e)=>n+(e.quantity||0),0)):null}));
        return {candyShort:candy&&Number.isFinite(candy.quantity)?Math.max(0,costs.candy-candy.quantity):null,shardShort:Math.max(0,costs.shards-inventory.dream_shards),itemShort,conditions:costs.conditions||[]};
    }
    const api={paths,projectEvolution,evolutionCost,milestones,line,best,at,candidates,owned,referenceBuild,resources};
    if(typeof module==='object')module.exports=api;else root.SleepIngredients=api;
})(globalThis);
