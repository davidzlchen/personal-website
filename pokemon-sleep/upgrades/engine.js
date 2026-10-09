/* Level-only projections for saved helpers; factual cost tables: levels.json. */
(function(root) {
    'use strict';
    const analyzer = typeof module==='object' ? require('../analyzer/engine.js') : root.SleepAnalyzer;
    function capForRank(rank, cap=70) {
        if(!Number.isInteger(rank) || rank<1) throw Error('Research rank unavailable.');
        return Math.min(cap, rank>=65?70:rank>=60?65:rank>=55?60:rank>=50?55:rank>=45?50:rank>=35?45:rank>=30?40:rank>=20?35:rank>=15?30:rank>=10?25:rank>=5?20:15);
    }
    function curveFor(mon, levels) {
        // Identify the captured growth curve from total EXP, not species guesses.
        const base=mon.xp_total-mon.xp_in_level;
        const matches=Object.entries(levels.cumulativeXP).filter(([,xp])=>xp[mon.level-1]===base);
        const selected=matches.length===1?matches:matches.filter(([,xp])=>Math.abs(xp[mon.level]-xp[mon.level-1]-mon.xp_level_required)<=1);
        if(selected.length!==1) throw Error('Growth curve or saved EXP unavailable.');
        return selected[0][1];
    }
    function candyXP(level, mon) {
        const base=level<25?40:level<30?35:25;
        const effect=mon.nature_neutralized?null:mon.nature_effects?.['EXP gains'];
        return Math.round(base*(effect==='up'?1.18:effect==='down'?.82:1));
    }
    function cost(mon, target, levels) {
        if(!Number.isInteger(target)||target<mon.level||target>levels.cap) throw Error('Invalid target level.');
        if(!Number.isInteger(mon.xp_in_level)||mon.xp_in_level<0) throw Error('Saved EXP unavailable.');
        const xp=curveFor(mon,levels);
        let level=mon.level, progress=mon.xp_in_level, candy=0, shards=0;
        const required=l=>l===mon.level?mon.xp_level_required:xp[l]-xp[l-1];
        if(target>level && !(required(level)>progress)) throw Error('Saved EXP does not match its level.');
        while(level<target) {
            shards+=levels.shardsPerCandy[level-1];
            progress+=candyXP(level,mon); candy++;
            while(level<target && progress>=required(level)) { progress-=required(level); level++; }
        }
        return {candy,shards};
    }
    function project(data, mon, target) {
        const build=analyzer.fromRoster(data,mon);
        build.level=target;
        // Unlike the detail view, future projections must validate locked slots too.
        build.ingredients=[1,30,60].map((unlock,i)=>{
            if(target<unlock) return build.ingredients[i];
            const saved=mon.ingredients[i];
            const found=build.species.ingredients[i].find(s=>s.name===saved?.name&&s.quantity===saved?.quantity);
            if(!found) throw Error('A future ingredient slot is unavailable.');
            return found;
        });
        if(build.subskills.some(s=>s.unlock<=target&&!data.subskills.includes(s.name))) throw Error('A future subskill is unavailable.');
        const extra=mon.subskills.filter(s=>s.unlock_level>mon.level&&s.unlock_level<=target)
            .reduce((sum,s)=>sum+(s.name==='Skill Level Up S'?1:s.name==='Skill Level Up M'?2:0),0);
        if(build.skillLevel!==null) build.skillLevel=Math.min(build.species.effect.maxLevel,build.skillLevel+extra);
        return build;
    }
    function thresholds(mon, cap) {
        const levels=new Set([30,60,cap,...mon.subskills.map(s=>s.unlock_level)]);
        return [...levels].filter(l=>l>mon.level&&l<=cap).sort((a,b)=>a-b);
    }
    function unlocks(mon,target,cap) {
        const labels=mon.subskills.filter(s=>s.unlock_level>mon.level&&s.unlock_level<=target).map(s=>`Lv. ${s.unlock_level}: ${s.name}`);
        for(const [i,level] of [[1,30],[2,60]]) if(mon.level<level&&target>=level) {
            const slot=mon.ingredients[i]; labels.push(`Lv. ${level}: ${slot?.name||'Unknown ingredient'} ×${slot?.quantity||'?'}`);
        }
        if(target===cap) labels.push(`Current level cap: ${cap}`);
        return labels;
    }
    const api={capForRank,curveFor,candyXP,cost,project,thresholds,unlocks};
    if(typeof module==='object') module.exports=api; else root.SleepUpgrades=api;
})(globalThis);
