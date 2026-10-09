/* Account planning heuristics, informed by the linked research; not game rules. */
(function(root){
    'use strict';
    // Primal simplex for max c.x with A.x <= b, x >= 0 and nonnegative b.
    // Bland's rule handles the zero-bound ingredient constraints deterministically.
    function maximize(A,b,c){
        const n=c.length,m=b.length,width=n+m+1,eps=1e-9;
        const t=A.map((row,i)=>[...row,...Array.from({length:m},(_,j)=>i===j?1:0),b[i]]);
        t.push([...c.map(v=>-v),...Array(m+1).fill(0)]);
        const basis=Array.from({length:m},(_,i)=>n+i);
        for(let step=0;step<10000;step++){
            const enter=t[m].findIndex((v,i)=>i<width-1&&v < -eps);if(enter<0){const x=Array(n).fill(0);basis.forEach((v,i)=>{if(v<n)x[v]=t[i][width-1];});return x;}
            let leave=-1,ratio=Infinity;
            for(let i=0;i<m;i++)if(t[i][enter]>eps){const r=t[i][width-1]/t[i][enter];if(r<ratio-eps||(Math.abs(r-ratio)<eps&&(leave<0||basis[i]<basis[leave]))){ratio=r;leave=i;}}
            if(leave<0)throw Error('Recipe rotation is unbounded.');
            const pivot=t[leave][enter];for(let j=0;j<width;j++)t[leave][j]/=pivot;
            for(let i=0;i<=m;i++)if(i!==leave){const factor=t[i][enter];if(Math.abs(factor)>eps)for(let j=0;j<width;j++)t[i][j]-=factor*t[leave][j];}
            basis[leave]=enter;
        }
        throw Error('Recipe rotation did not converge.');
    }
    function rotation(pool,recipe,slots=3,override){
        const needs=Object.entries(recipe.ingredients);
        const helpers=pool.map(p=>override?.id===p.id?override:p).filter(p=>needs.some(([name])=>(p.ingredients[name]||0)>0));
        // A bounded shortlist keeps interactive comparisons quick. Include the
        // best producers per ingredient and mixed producers, plus the changed helper.
        const chosen=new Set();
        for(const [name] of needs)helpers.slice().sort((a,b)=>(b.ingredients[name]||0)-(a.ingredients[name]||0)).slice(0,3).forEach(p=>chosen.add(p));
        helpers.slice().sort((a,b)=>needs.reduce((s,[k,v])=>s+(b.ingredients[k]||0)/v-(a.ingredients[k]||0)/v,0)).slice(0,3).forEach(p=>chosen.add(p));
        const changed=helpers.find(p=>p.id===override?.id);if(changed)chosen.add(changed);
        const list=[...chosen],n=list.length;
        if(!n)return {meals:0,slots:0,farmers:[],supply:{}};
        const A=needs.map(([name,amount])=>[...list.map(p=>-(p.ingredients[name]||0)),amount]);
        const b=needs.map(()=>0);
        A.push([...Array(n).fill(1),0]);b.push(slots);
        for(let i=0;i<n;i++){A.push([...Array.from({length:n},(_,j)=>i===j?1:0),0]);b.push(1);}
        A.push([...Array(n).fill(0),1]);b.push(3);
        const x=maximize(A,b,[...Array(n).fill(-1e-7),1]);
        const farmers=list.map((p,i)=>({id:p.id,fraction:Math.max(0,x[i])})).filter(p=>p.fraction>1e-5);
        const supply=Object.fromEntries(needs.map(([name])=>[name,list.reduce((sum,p,i)=>sum+(p.ingredients[name]||0)*Math.max(0,x[i]),0)]));
        return {meals:Math.min(3,Math.max(0,x[n])),slots:farmers.reduce((s,f)=>s+f.fraction,0),farmers,supply};
    }
    function leadingRecipes(recipes,pool,slots,pot,solve=r=>rotation(pool,r,slots)){
        const candidates=recipes.filter(r=>pot===null||r.size<=pot);
        return ['curry','salad','dessert'].flatMap(type=>{
            const same=candidates.filter(r=>r.type===type);
            const current=Math.max(0,...same.map(r=>solve(r).meals*r.baseStrength));
            return same.filter(r=>r.baseStrength*3>=current).sort((a,b)=>b.baseStrength-a.baseStrength).slice(0,10);
        });
    }
    function ledger(plan,inventory){
        let shards=0;const candy={};for(const item of plan){shards+=item.costs.shards;candy[item.family]=(candy[item.family]||0)+item.costs.candy;}
        return {shards,candy,remaining:inventory.dream_shards-shards};
    }
    function resources(costs,family,inventory,settings,plan=[],id){
        const used=ledger(plan.filter(p=>p.id!==id),inventory),saved=Object.values(inventory.pokemon_candies||{}).find(c=>c.name===family)?.quantity;
        const allowance=typeof saved==='number'?Math.floor(saved*(1-settings.candyReserve/100)):0;
        const candyLeft=Math.max(0,allowance-(used.candy[family]||0));
        const shardLeft=Math.max(0,Math.min(settings.budget,inventory.dream_shards)-used.shards);
        return {fits:costs.shards<=shardLeft&&costs.candy<=candyLeft&&typeof saved==='number',saved,allowance,candyLeft,shardLeft,shardShare:costs.shards/inventory.dream_shards,candyShare:saved?costs.candy/saved:Infinity};
    }
    function utility(projection){
        const {build,result}=projection,effect=build.species.effect,index=build.skillLevel-1;
        const kind=effect.name==='Energy For Everyone S'?'healer':effect.name==='Cooking Power-Up S'?'pot':effect.name==='Tasty Chance S'?'crit':null;
        const value=kind==='healer'?effect.energyAmounts?.[index]:kind==='pot'?effect.potSizeAmounts?.[index]:kind==='crit'?effect.chanceAmounts?.[index]:0;
        return {kind,value:(value||0)*result.triggers};
    }
    function assess(row,context){
        const {pool,recipe,baseline,slots,bestStrength,bestShards,bestUtility}=context;
        const evolved=row.p.build.species.remainingEvolutions===0;
        const next=context.rotationFor?context.rotationFor(row):rotation(pool,recipe,slots,{id:row.mon.id,ingredients:row.p.result.ingredients});
        const mealGain=Math.max(0,next.meals-baseline.meals),slotGain=baseline.meals>=2.99&&next.meals>=2.99?Math.max(0,baseline.slots-next.slots):0;
        const benefit=mealGain/3+slotGain/slots;
        const currentU=utility(row.current),nextU=utility(row.p);
        let kind='hold',reason='Does not improve the selected recipe rotation or replace an existing lead helper.',impact=0;
        if(!evolved){reason='Evolve and evaluate the final form first; this level-only projection cannot price the evolution.';}
        else if(mealGain>=.02||slotGain>=.05){kind='recipe';impact=benefit;reason=mealGain>=.02?`Recipe coverage improves from ${baseline.meals.toFixed(2)} to ${next.meals.toFixed(2)} meals/day.`:`Can free about ${slotGain.toFixed(2)} ingredient team slots while covering 3 meals/day.`;}
        else if(row.afterOutput.strength!==null&&row.afterOutput.strength>bestStrength.value*1.01&&row.afterOutput.strength>row.beforeOutput.strength){kind='strength';impact=(row.afterOutput.strength-bestStrength.value)/Math.max(bestStrength.value,1);reason=`Can outperform your current strength lead, ${bestStrength.name}, on this island.`;}
        else if(nextU.kind&&nextU.value>(bestUtility[nextU.kind]?.value||0)*1.1&&nextU.value>currentU.value&&(nextU.kind!=='pot'||(context.config?.pot&&recipe.size>context.config.pot&&currentU.value/3<recipe.size-context.config.pot&&nextU.value/3>=recipe.size-context.config.pot))){kind='support';impact=(nextU.value-(bestUtility[nextU.kind]?.value||0))/Math.max(bestUtility[nextU.kind]?.value||1,1);reason=`Improves the modeled ${nextU.kind==='healer'?'team-energy':nextU.kind==='pot'?'pot-space':'extra-tasty'} output beyond your current lead. Team benefits are not included in strength.`;}
        else if(row.afterOutput.shards>bestShards.value*1.01&&row.afterOutput.shards>row.beforeOutput.shards){kind='shards';impact=(row.afterOutput.shards-bestShards.value)/Math.max(bestShards.value,1);reason=`Can outperform your current shard lead, ${bestShards.name}.`;}
        const payback=row.afterOutput.shards>row.beforeOutput.shards?row.costs.shards/(row.afterOutput.shards-row.beforeOutput.shards):null;
        if(kind==='shards'&&payback>180){kind='hold';reason=`About ${Math.ceil(payback)} days of additional skill shards to recover this shard spend; your existing shard farmer remains usable.`;}
        return {kind,reason,impact,mealGain,slotGain,next,payback};
    }
    // User strategy: specialist breakpoints first; resource availability is separate.
    function milestone(row,cap){
        const species=row.p.build.species,role=species.specialty,target=row.p.level,mon=row.mon;
        const active=name=>mon.subskills.some(s=>s.name===name&&s.unlock_level<=target);
        const speed=active('Helping Speed M')||active('Helping Speed S')||active('Helping Bonus');
        const bfs=active('Berry Finding S');
        let kind='hold',reason='Explore this level in a raw comparison.',impact=0,quality=0;
        if(species.remainingEvolutions>0)return {kind,reason:'Review evolution before committing to this level-only investment.',impact,quality};
        if(role==='ingredient'&&[30,60].includes(target)){
            kind='ingredient';reason=`Ingredient specialist: Lv. ${target} unlocks the ${target===30?'second':'third'} ingredient slot. Check the saved ingredient mix before investing.`;
            impact=Math.max(0,row.p.result.totalIngredients/Math.max(row.current.result.totalIngredients,1)-1);
        }else if(role==='skill'&&[25,50].includes(target)){
            kind='skill';const skill=mon.subskills.find(s=>s.unlock_level===target)?.name;
            reason=`Skill specialist: Lv. ${target} unlocks ${skill||'a subskill'}. `+(skill&&/Skill Trigger|Skill Level Up|Helping Speed|Helping Bonus/.test(skill)?'This supports skill output.':'This is a review point; the unlocked subskill may not improve skill output.');
            impact=Math.max(0,row.p.result.triggers/Math.max(row.current.result.triggers,.01)-1);
        }else if(role==='berry'&&(target===Math.min(mon.level+5,cap)||target===cap||mon.subskills.some(s=>s.unlock_level===target&&['Berry Finding S','Helping Speed M','Helping Speed S','Helping Bonus'].includes(s.name)))){
            kind='berry';
            reason=(bfs&&speed?'Strong berry build: Berry Finding S plus helping speed. ':bfs?'Berry Finding S makes this a berry investment candidate. ':'Berry specialist: review the build before a large investment. ')+`Berry strength grows with level; ${target===cap?'Lv. '+cap+' is the long-term target.':'Lv. '+target+' is a staged investment.'}`;
            impact=Math.max(0,row.afterOutput.effect.berryStrength/Math.max(row.beforeOutput.effect.berryStrength,1)-1);
        }
        // Use one build score across this helper's targets so an expensive
        // later unlock cannot outrank its cheaper first milestone.
        const signal=name=>mon.subskills.some(s=>s.name===name&&s.unlock_level<=cap);
        const buildSpeed=signal('Helping Speed M')||signal('Helping Speed S')||signal('Helping Bonus');
        quality=role==='berry'?(signal('Berry Finding S')?3:0)+(buildSpeed?2:0):
            role==='ingredient'?(signal('Ingredient Finder M')?2:signal('Ingredient Finder S')?1:0)+(buildSpeed?1:0):
            (signal('Skill Trigger M')?2:signal('Skill Trigger S')?1:0)+(buildSpeed?1:0);
        return {kind,reason,impact,quality};
    }
    const api={milestone,maximize,rotation,leadingRecipes,ledger,resources,utility,assess};
    if(typeof module==='object')module.exports=api;else root.SleepPriorities=api;
})(globalThis);
