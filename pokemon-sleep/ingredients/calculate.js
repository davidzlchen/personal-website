(function(root){
'use strict';
const A=typeof module==='object'?require('../analyzer/engine.js'):root.SleepAnalyzer;
const M=typeof module==='object'?require('../mints/model.js'):root.SleepMints;
const Seeds=typeof module==='object'?require('./seeds.js'):root.SleepIngredientSeeds;
const I=typeof module==='object'?require('./model.js'):root.SleepIngredients;
function calculate({catalog,roster,cap,levels,evolutions},progress=()=>{}){
        const rows=[],excluded=[],references=[];
        const helpers=roster.filter(m=>m.specialty==='Ingredients');
        for(const [i,mon] of helpers.entries()){
            try{const r=I.owned(catalog,mon,cap,levels,undefined,evolutions);if(r)rows.push(r);else excluded.push({id:mon.id,reason:'Exact species/form unavailable in the production catalog.'});}
            catch(error){excluded.push({id:mon.id,reason:error.message});}
            progress({progress:`Saved ingredient specialists: ${i+1} / ${helpers.length}`});
        }
        const species=catalog.species.filter(p=>p.specialty==='ingredient'&&p.remainingEvolutions===0);
        for(const [i,p] of species.entries()){
            const names=[...new Set(p.ingredients.flat().map(s=>s.name))];
            for(const name of names){
                const build=I.referenceBuild(catalog,p,name,cap,false,evolutions);
                if(!build)continue;
                const result=A.simulate(build,A.defaultConditions);
                references.push({key:p.key,name:p.name,dex:p.dex,ingredient:name,amount:result.ingredients[name]||0,line:build.ingredients.map(s=>s.name),aaa:build.ingredients.every(s=>s.name===name),level:cap});
            }
            progress({progress:`Species references: ${i+1} / ${species.length}`});
        }
progress({progress:'Neutralizing Mint and leveling plans'});
const mints=M.calculate(catalog,helpers,evolutions);
for(const row of mints.rows){
    const mon=helpers.find(m=>m.id===row.id);
    try{row.plan=I.owned(catalog,{...mon,nature_neutralized:true},cap,levels,undefined,evolutions);}
    catch(error){row.planError=error.message;}
}
const seeds={rows:[],excluded:[]};
for(const mon of helpers){
    const original=rows.find(r=>r.id===mon.id);if(!original)continue;
    const minted=mints.rows.find(r=>r.id===mon.id)?.plan;
    for(const [mint,source] of [[false,original],[true,minted]]){
        if(!source)continue;
        try{const plan=Seeds.project(catalog,mint?{...mon,nature_neutralized:true}:mon,original,source,cap,evolutions);if(plan.projections.length>1)seeds.rows.push({id:mon.id,mint,plan});}
        catch(error){seeds.excluded.push({id:mon.id,mint,reason:error.message});}
    }
}
return {rows,excluded,references,total:helpers.length,mints,seeds};
}
if(typeof module==='object')module.exports=calculate;else root.calculateSleepIngredients=calculate;
})(typeof self==='object'?self:globalThis);
