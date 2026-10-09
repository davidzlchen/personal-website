importScripts('../analyzer/engine.js','engine.js');
self.onmessage=({data:{catalog,roster,cap}})=>{
    const results=[],skipped=[];
    for(const [i,mon] of roster.entries()) {
        try {
            const targets=[mon.level,...SleepUpgrades.thresholds(mon,cap)];
            const projections=targets.map(level=>{
                const build=SleepUpgrades.project(catalog,mon,level);
                return {level,build,result:SleepAnalyzer.simulate(build,SleepAnalyzer.defaultConditions)};
            });
            results.push({id:mon.id,projections});
        } catch(error) {skipped.push({id:mon.id,reason:error.message});}
        self.postMessage({progress:i+1,total:roster.length});
    }
    self.postMessage({results,skipped});
};
