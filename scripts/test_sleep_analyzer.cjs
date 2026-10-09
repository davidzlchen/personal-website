const assert = require('node:assert/strict');
const engine = require('../pokemon-sleep/analyzer/engine.js');
const data = require('../pokemon-sleep/analyzer/data.json');
const neutral = data.natures.find(n=>n.name==='Hardy');
const conditions={sleepHours:0,collectHours:1,energy:'zero',helpingBonus:0,ribbon:0,camp:false};
const fixture={key:'TEST',name:'Test',specialty:'berry',frequency:3600,carry:100000,
    ingredientRate:0,skillRate:1,remainingEvolutions:0,pity:78};
const build={species:fixture,level:1,carry:100000,nature:neutral,ingredients:[1,2,4].map(quantity=>({name:'Honey',quantity})),subskills:[]};
let r=engine.simulate(build,conditions,100);
assert.equal(r.helps,24); assert.equal(r.berries,48); assert.equal(r.totalIngredients,0); assert.equal(r.triggers,24,'final boundary help is collected');
r=engine.simulate(build,{...conditions,collectHours:24},100);
assert.equal(r.triggers,1,'berry specialists store one proc');
const skills={...build,species:{...fixture,specialty:'skill'}};
assert.equal(engine.simulate(skills,{...conditions,collectHours:24},100).triggers,2,'skill specialists store two');
const allIngredient={...build,species:{...fixture,ingredientRate:1,skillRate:0,pity:Infinity}};
assert.equal(engine.simulate(allIngredient,conditions,100).totalIngredients,24);
assert.equal(engine.simulate({...allIngredient,level:30},conditions,4000).totalIngredients > 36,true,'level 30 ingredient slot unlocks');
assert.equal(engine.simulate({...allIngredient,level:60},conditions,4000).totalIngredients > 60,true,'level 60 slot unlocks');
const full=engine.simulate({...allIngredient,carry:1},{...conditions,collectHours:24},100);
assert.equal(full.totalIngredients,1); assert.equal(full.sneaky,46); assert.equal(full.berries,46,'full inventory switches to sneaky berries');
assert.equal(full.triggers,0,'no procs after inventory fills');
const subs=[{name:'Berry Finding S',unlock:10},{name:'Helping Speed M',unlock:25},{name:'Helping Speed S',unlock:50},{name:'Helping Bonus',unlock:75}];
assert.equal(engine.stats({...build,subskills:subs},conditions).berriesPerHelp,2);
assert.equal(engine.stats({...build,level:10,subskills:subs},conditions).berriesPerHelp,3);
assert.equal(engine.stats({...build,level:100,subskills:subs},{...conditions,helpingBonus:4}).frequency,
    Math.floor(Math.round(.65*(1-.002*99)*10000)/10000*3600),'35% cap including own Helping Bonus');
const rates=engine.stats({...build,level:60,species:{...fixture,ingredientRate:.2,skillRate:.1},nature:data.natures.find(n=>n.name==='Quiet'),
    subskills:[{name:'Ingredient Finder S',unlock:10},{name:'Ingredient Finder M',unlock:25},{name:'Skill Trigger M',unlock:50}]},conditions);
assert.ok(Math.abs(rates.ingredientRate-.2*1.2*1.54)<1e-10);
assert.ok(Math.abs(rates.skillRate-.136)<1e-10);
assert.deepEqual([0,1,40,60,80,150].map(engine.energyFactor),[1,.66,.58,.52,.45,.45]);
assert.ok(engine.stats(build,{...conditions,camp:true}).frequency < engine.stats(build,conditions).frequency);
assert.equal(engine.stats({...build,carry:10},{...conditions,camp:true,ribbon:2000}).capacity,22);
const pity=engine.simulate({...build,species:{...fixture,skillRate:0,pity:2}},conditions,100);
assert.equal(pity.triggers,8,'pity proc after threshold plus one help');
assert.deepEqual(engine.simulate(build,conditions,100),engine.simulate(build,conditions,100),'repeatable estimates');
for(const p of data.species) {
    const b={...build,species:p,level:60,carry:p.carry,ingredients:p.ingredients.map(s=>s[0])};
    const r=engine.simulate(b,{...conditions,sleepHours:8.5,collectHours:3,energy:'natural'},20);
    for(const k of ['berries','triggers','totalIngredients','fullHours'])assert.ok(Number.isFinite(r[k])&&r[k]>=0,p.key+' '+k);
    assert.ok(r.fullHours<=24); assert.ok(r.sneaky<=r.berries);
}
console.log(`Production mechanics, caps, boundary collection, inventory overflow, reproducibility, and ${data.species.length} species verified.`);
// Saved-build adaptation must respect active slots and fail closed for unknown forms.
const roster=require('../pokemon-sleep/roster.json').records;
const helper=roster.find(p=>p.nickname==='charge king');
const adapted=engine.fromRoster(data,helper);
assert.equal(adapted.level,helper.level);
assert.equal(adapted.carry,adapted.species.carry);
assert.throws(()=>engine.fromRoster(data,{...helper,variant:'Costume'}),/form/);
assert.throws(()=>engine.fromRoster(data,{...helper,nature:null}),/nature/);
assert.throws(()=>engine.fromRoster(data,{...helper,ingredients:[{name:null,quantity:null}]}),/ingredient/);
assert.doesNotThrow(()=>engine.fromRoster(data,{...helper,level:10,ingredients:[helper.ingredients[0]],subskills:[]}));
assert.equal(engine.fromRoster(data,{...helper,nature_neutralized:true}).nature.name,'Hardy');
