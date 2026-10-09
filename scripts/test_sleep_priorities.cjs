const assert=require('node:assert/strict'),P=require('../pokemon-sleep/upgrades/priorities.js'),recipes=require('../pokemon-sleep/upgrades/recipes.json').recipes;
let result=P.rotation([{id:'a',ingredients:{A:20}},{id:'b',ingredients:{B:20}}],{ingredients:{A:10,B:10}},2);
assert.ok(Math.abs(result.meals-2)<1e-6);assert.ok(Math.abs(result.slots-2)<1e-6);
// One helper cannot be counted as multiple full-time sources; mixed output counts together.
result=P.rotation([{id:'mixed',ingredients:{A:60,B:60}}],{ingredients:{A:10,B:10}},1);
assert.ok(Math.abs(result.meals-3)<1e-6);assert.ok(Math.abs(result.slots-.5)<1e-6);
result=P.rotation([{id:'only',ingredients:{A:100}}],{ingredients:{A:10,B:10}},4);assert.equal(result.meals,0);
const benchmarkRecipes=[{id:'current',type:'curry',size:10,ingredients:{A:10},baseStrength:10},{id:'weak-tail',type:'curry',size:5,ingredients:{Tail:5},baseStrength:2},{id:'future',type:'curry',size:20,ingredients:{B:20},baseStrength:20}];
assert.deepEqual(P.leadingRecipes(benchmarkRecipes,[{id:'a',ingredients:{A:30}}],1,null).map(r=>r.id),['future','current']);
assert.deepEqual(P.leadingRecipes(benchmarkRecipes,[{id:'a',ingredients:{A:30}}],1,10).map(r=>r.id),['current']);
const pool=[{id:'a',ingredients:{A:10}},{id:'b',ingredients:{B:30}}],recipe={ingredients:{A:10,B:10}};
assert.ok(P.rotation(pool,recipe,2,{id:'a',ingredients:{A:30}}).meals>P.rotation(pool,recipe,2).meals);
// Saved shard and family-candy balances constrain the entire plan, not every option independently.
const inventory={dream_shards:1000,pokemon_candies:{a:{name:'Shared Candy',quantity:100},b:{name:'Shared Candy',quantity:100}}},settings={budget:300,candyReserve:20};
const plan=[{id:'a',family:'Shared Candy',costs:{shards:200,candy:60}}];
assert.equal(P.resources({shards:100,candy:21},'Shared Candy',inventory,settings,plan,'b').fits,false);
assert.equal(P.resources({shards:101,candy:20},'Shared Candy',inventory,settings,plan,'b').fits,false);
assert.equal(P.resources({shards:100,candy:20},'Shared Candy',inventory,settings,plan,'b').fits,true);
assert.equal(P.resources({shards:300,candy:80},'Shared Candy',inventory,settings,plan,'a').fits,true); // Replacing one target releases its previous spend.
assert.deepEqual(P.ledger(plan,inventory),{shards:200,candy:{'Shared Candy':60},remaining:800});
const projection={build:{species:{remainingEvolutions:1,effect:{name:'Other'}},skillLevel:1},result:{triggers:1,ingredients:{A:30}}};
const row={mon:{id:'a'},p:projection,current:projection,beforeOutput:{strength:100,shards:0},afterOutput:{strength:1000,shards:0},costs:{shards:100,candy:10}};
const context={pool,recipe,baseline:P.rotation(pool,recipe,2),slots:2,bestStrength:{name:'Existing',value:100},bestShards:{name:'Existing Swalot',value:1000},bestUtility:{}};
assert.equal(P.assess(row,context).kind,'hold'); // Cheap unevolved raw-output gains do not become account priorities.
const evolved={...projection,build:{...projection.build,species:{...projection.build.species,remainingEvolutions:0}}};
assert.equal(P.assess({...row,p:evolved,afterOutput:{strength:100,shards:2000},beforeOutput:{strength:100,shards:1000},costs:{shards:300000,candy:100}}, {...context,baseline:P.rotation([{id:'a',ingredients:{A:30}},{id:'b',ingredients:{B:30}}],recipe,2),pool:[{id:'a',ingredients:{A:30}},{id:'b',ingredients:{B:30}}]}).kind,'hold');
assert.equal(recipes.find(r=>r.id==='BOUNCE_CURRY_UDON').ingredients['Warming Ginger'],39);
assert.equal(recipes.find(r=>r.id==='HONEY_GATHER_CHOCOLATE_WAFFLES').size,115);
for(const r of recipes){assert.equal(Object.values(r.ingredients).reduce((s,n)=>s+n,0),r.size);assert.ok(r.baseStrength>0);}
assert.equal(new Set(recipes.map(r=>r.id)).size,recipes.length);
console.log('Recipe rotation, slot limits, mixed output, missing ingredients, shared resource ledger, evolution review, shard payback, and recipe catalog pass.');
