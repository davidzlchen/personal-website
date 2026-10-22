/* A resource-aware recommendation heuristic over cached production, not a game mechanic. */
(function(root){
'use strict';
function recommend(row,mon,ingredient,inventory){
    const current=row.projections[0],amount=p=>p.ingredients[ingredient]||0,baseline=amount(current);
    const candy=inventory.pokemon_candies?.[mon.id]?.quantity;
    // Compare early unlocks and the levels just before a new slot dilutes a mixed line.
    const levels=new Set([mon.level,29,30,59,60,...(row.evolutionPaths||[]).map(p=>p.minLevel),...(mon.subskills||[]).map(s=>s.unlock_level)]);
    const candyScale=Number.isFinite(candy)?Math.max(25,Math.min(400,candy/2)):400;
    const shardScale=Math.max(5000,Math.min(100000,(inventory.dream_shards||0)/8));
    let selected=null;
    for(const p of row.projections){
        if((p.level>60&&p.level!==mon.level)||p.level<mon.level||!levels.has(p.level)||!p.costs)continue;
        const gain=amount(p)-baseline;
        if(gain<Math.max(3,baseline*.1))continue;
        const cost=p.costs,candyShort=Number.isFinite(candy)?Math.max(0,cost.candy-candy):0,shardShort=Math.max(0,cost.shards-(inventory.dream_shards||0));
        const items=Object.entries(cost.items||{}),itemPending=items.some(([name,n])=>!Array.isArray(inventory.entries)||inventory.entries.filter(e=>e.name===name).reduce((sum,e)=>sum+(e.quantity||0),0)<n);
        const burden=(cost.seedCount||0)*2+cost.candy/candyScale+cost.shards/shardScale+candyShort/candyScale+shardShort/shardScale;
        const score=gain/(1+burden)*(itemPending?.5:1)*((cost.conditions||[]).length?.75:1);
        if(!selected||score>selected.score)selected={target:p,gain,score,invest:true};
    }
    if(!selected)return {target:current,gain:0,score:0,invest:false,reason:'Keep current level; no priced milestone through Lv. 60 adds at least 3/day and 10% production.'};
    const p=selected.target,reason=p.level===30||p.level===60?'Ingredient slot unlock':p.steps?.length?'Evolution milestone':'Subskill or ingredient breakpoint';
    return {...selected,reason:reason+'; production gain weighed against incremental candy, shards, and saved balances.'};
}
const api={recommend};if(typeof module==='object')module.exports=api;else root.SleepPracticalIngredients=api;
})(globalThis);
