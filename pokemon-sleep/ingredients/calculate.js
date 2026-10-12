(function(root){
'use strict';
const A=typeof module==='object'?require('../analyzer/engine.js'):root.SleepAnalyzer;
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
return {rows,excluded,references,total:helpers.length};
}
if(typeof module==='object')module.exports=calculate;else root.calculateSleepIngredients=calculate;
})(typeof self==='object'?self:globalThis);
