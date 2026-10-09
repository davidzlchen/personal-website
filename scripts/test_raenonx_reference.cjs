const assert=require('node:assert/strict');
const engine=require('../pokemon-sleep/analyzer/engine');
const outcomes=require('../pokemon-sleep/analyzer/outcomes');
const data=require('../pokemon-sleep/analyzer/data.json');
const reference=require('./raenonx-reference.json');
const roster=require('../pokemon-sleep/snapshots/'+reference.snapshot+'.json').roster.records;
const c={...engine.defaultConditions,energy:'high',collectHours:1/60,pity:false};
const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<=Math.max(.025,Math.abs(expected)*.006),`${label}: ${actual} versus ${expected}`);
for(const ref of reference.cases){
 const mon=roster.find(p=>p.id===ref.id);
 assert.equal(mon.species,ref.species);assert.equal(mon.level,ref.level);assert.equal(mon.main_skill.level,ref.skillLevel);
 assert.equal(mon.subskills.some(s=>s.name==='Helping Bonus'),false);
 const b={...engine.fromRoster(data,mon),carry:100000};
 const result=engine.simulate(b,c,60000), effect=outcomes.evaluate(b,result,c);
 close(result.helps,ref.helps,ref.species+' helps');close(result.berries,ref.berries,ref.species+' berries');
 close(result.triggers,ref.triggers,ref.species+' ordinary skill triggers');
 for(const [name,count]of Object.entries(ref.ingredients))close(result.ingredients[name],count,name);
 close(effect.berryStrength,ref.berryStrength,ref.species+' berry strength');
 close(effect.skillStrength,ref.skillStrength,ref.species+' skill strength');
 close(effect.dreamShards,ref.dreamShards,ref.species+' Dream Shards');
 console.log(JSON.stringify({species:ref.species,helps:result.helps,berries:result.berries,ingredients:result.ingredients,
  triggers:result.triggers,berryStrength:effect.berryStrength,skillStrength:effect.skillStrength,dreamShards:effect.dreamShards}));
}
// Fractional progress must persist, rather than lose an unfinished help every day.
const p=data.species.find(p=>p.key==='AMPHAROS');const b={...engine.fromRoster(data,roster.find(p=>p.id==='mon-50')),carry:100000};
const result=engine.simulate(b,c,60000);
close(result.helps,86400/(result.stats.frequency*.45),'fractional daily helps');
const dragonite={...engine.fromRoster(data,roster.find(p=>p.id==='mon-52')),carry:100000};
assert.ok(engine.simulate(dragonite,{...c,pity:true},60000).triggers>engine.simulate(dragonite,c,60000).triggers,'pity is a real model difference, not silently removed to force parity');
console.log('Recorded live RaenonX baselines agree within rounding and sampling tolerance; pity difference remains explicit.');
