importScripts('../analyzer/engine.js','../upgrades/engine.js?v=2','model.js?v=1');
self.onmessage=({data:{catalog,roster,cap,levels}})=>{
    try{
        const rows=[],excluded=[],references=[];
        const helpers=roster.filter(m=>m.specialty==='Ingredients');
        for(const [i,mon] of helpers.entries()){
            try{const r=SleepIngredients.owned(catalog,mon,cap,levels);if(r)rows.push(r);else excluded.push({id:mon.id,reason:'Exact species/form unavailable in the production catalog.'});}
            catch(error){excluded.push({id:mon.id,reason:error.message});}
            self.postMessage({progress:`Saved ingredient specialists: ${i+1} / ${helpers.length}`});
        }
        const species=catalog.species.filter(p=>p.specialty==='ingredient'&&p.remainingEvolutions===0);
        for(const [i,p] of species.entries()){
            const names=[...new Set(p.ingredients.flat().map(s=>s.name))];
            for(const name of names){
                const build=SleepIngredients.referenceBuild(catalog,p,name,cap,false);
                if(!build)continue;
                const result=SleepAnalyzer.simulate(build,SleepAnalyzer.defaultConditions);
                references.push({key:p.key,name:p.name,dex:p.dex,ingredient:name,amount:result.ingredients[name]||0,line:build.ingredients.map(s=>s.name),aaa:build.ingredients.every(s=>s.name===name),level:cap});
            }
            self.postMessage({progress:`Species references: ${i+1} / ${species.length}`});
        }
        self.postMessage({rows,excluded,references,total:helpers.length});
    }catch(error){self.postMessage({error:error.message});}
};
