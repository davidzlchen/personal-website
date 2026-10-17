/* Matched current-level comparisons: remove both nature bonuses and penalties. */
(function(root){
'use strict';
const A=typeof module==='object'?require('../analyzer/engine.js'):root.SleepAnalyzer;
function compare(catalog,mon,evolutions,simulate=A.simulate){
    if(mon.nature_neutralized)return null;
    const build=A.fromRoster(catalog,mon),neutral=catalog.natures.find(n=>n.name==='Hardy');
    if(['speed','ingredient','skill','energy'].every(key=>build.nature[key]===neutral[key]))return null;
    build.carry=build.species.carry+5*(evolutions.previousEvolutions[build.species.key]||0);
    const before=simulate(build,A.defaultConditions),after=simulate({...build,nature:neutral},A.defaultConditions);
    const compact=r=>({berries:r.berries,triggers:r.triggers,totalIngredients:r.totalIngredients,ingredients:r.ingredients});
    const metric=mon.specialty==='Ingredients'?'totalIngredients':mon.specialty==='Skills'?'triggers':mon.specialty==='Berries'?'berries':null;
    if(!metric)throw Error('This specialty has no comparable primary-output metric.');
    const gain=after[metric]-before[metric],percent=before[metric]>0?gain/before[metric]*100:null;
    return {id:mon.id,metric,before:compact(before),after:compact(after),gain,percent,positive:gain>0&&percent>=1,aaa:mon.ingredients.length===3&&mon.ingredients.every(i=>i.name===mon.ingredients[0].name),effects:mon.nature_effects||{},level:mon.level,carry:build.carry};
}
function calculate(catalog,roster,evolutions,simulate=A.simulate){
    const rows=[],excluded=[];
    for(const mon of roster)try{const row=compare(catalog,mon,evolutions,simulate);if(row)rows.push(row);}catch(error){excluded.push({id:mon.id,reason:error.message});}
    return {rows,excluded};
}
function candidates(rows,roster,{specialty='',aaa=true,favorites=false,query=''}={}){
    return rows.filter(r=>r.positive).map(r=>({...r,mon:roster.find(m=>m.id===r.id)})).filter(r=>r.mon&&(!specialty||r.mon.specialty===specialty)&&(!aaa||r.mon.specialty!=='Ingredients'||r.aaa)&&(!favorites||r.mon.favorite)&&`${r.mon.species} ${r.mon.nickname||''}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.mon.specialty.localeCompare(b.mon.specialty)||b.gain-a.gain||b.mon.level-a.mon.level||a.id.localeCompare(b.id));
}
const api={compare,calculate,candidates};if(typeof module==='object')module.exports=api;else root.SleepMints=api;
})(globalThis);
