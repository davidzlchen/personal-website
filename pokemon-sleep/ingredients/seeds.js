/* Guaranteed seed bundles: upgrade every eligible unlocked skill, regardless of roll order. */
(function(root){
'use strict';
const A=typeof module==='object'?require('../analyzer/engine.js'):root.SleepAnalyzer;
const I=typeof module==='object'?require('./model.js'):root.SleepIngredients;
const upgrades={'Ingredient Finder S':'Ingredient Finder M','Helping Speed S':'Helping Speed M','Inventory Up S':'Inventory Up M','Inventory Up M':'Inventory Up L','Skill Trigger S':'Skill Trigger M','Skill Level Up S':'Skill Level Up M'};
function bundle(mon,level){
    const subskills=mon.subskills.map(s=>({...s})),steps=[];
    // Eligibility checks the entire saved line, including skills not yet unlocked.
    for(;;){
        const skill=subskills.find(s=>s.unlock_level<=level&&upgrades[s.name]&&!subskills.some(other=>other.name===upgrades[s.name]));
        if(!skill)break;
        const from=skill.name,to=upgrades[from];steps.push({from,to,unlock:skill.unlock_level});skill.name=to;
    }
    return {subskills,steps};
}
function project(catalog,mon,original,source,cap,evolutions,simulate=A.simulate){
    const levels=new Set([mon.level,29,30,59,60,...mon.subskills.map(s=>s.unlock_level),...source.evolutionPaths.map(p=>p.minLevel)]),projections=[original.projections[0]];
    for(const p of source.projections){
        if(!levels.has(p.level)||(p.level>60&&p.level!==mon.level)||!p.costs)continue;
        const seeded=bundle(mon,p.level);if(!seeded.steps.length)continue;
        const species=catalog.species.find(s=>s.key===p.form.key),build=I.projectEvolution(catalog,mon,p.level,{species,steps:p.steps},evolutions);
        build.subskills=seeded.subskills.map(s=>({name:s.name,unlock:s.unlock_level}));
        if(build.skillLevel!==null)build.skillLevel=Math.min(species.effect.maxLevel,build.skillLevel+seeded.steps.filter(s=>s.from==='Skill Level Up S').length);
        const result=simulate(build,A.defaultConditions),seedCount=seeded.steps.length;
        projections.push({...p,ingredients:result.ingredients,berries:result.berries,triggers:result.triggers,skillLevel:build.skillLevel,seedCount,seedUpgrades:seeded.steps,withoutSeeds:{ingredients:p.ingredients,berries:p.berries,triggers:p.triggers},costs:{...p.costs,seedCount,items:{...p.costs.items,'Sub Skill Seed':seedCount}}});
    }
    return {...source,projections};
}
const api={bundle,project};if(typeof module==='object')module.exports=api;else root.SleepIngredientSeeds=api;
})(globalThis);
