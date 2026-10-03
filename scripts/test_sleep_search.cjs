const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '../pokemon-sleep');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'asset-data.js'), 'utf8'), context);
vm.runInContext(app.slice(app.indexOf('const natureAbbreviations'), app.indexOf('function natureBadges')) +
    app.slice(app.indexOf('function speciesLabel'), app.indexOf('function render()')), context);
const mon = {species:'Ampharos', nickname:'charge king', nature:'Brave', berry:'Grepa Berry',
    main_skill:{name:'Charge Strength M'}, ingredients:[{name:'Fancy Egg'}],
    subskills:[{name:'Skill Trigger M'},{name:'Helping Speed M'}],
    nature_effects:{'Speed of help':'up','EXP gains':'down'}};
context.mon = mon;
const matches = query => vm.runInContext(`matchesSearch(mon, ${JSON.stringify(query)})`, context);
for (const query of ['', 'stm', 'hsm', 'soh', 'exp', '↑ soh', '↓ exp', 'charge king', 'fancy egg', 'skill trigger', 'brave'])
    assert.equal(matches(query), true, query);
for (const query of ['sts', 'msc', 'ing', 'er', '↓ soh', '↑ exp'])
    assert.equal(matches(query), false, query);
mon.nature_effects = {'Ingredient finding':'up','Main skill chance':'down'};
assert.equal(matches('ing'), true);
assert.equal(matches('msc'), true);
assert.equal(matches('↓ msc'), true);
assert.equal(matches('↑ msc'), false);
console.log('Subskill and nature badge search, directions, full names, and substring collisions verified.');
