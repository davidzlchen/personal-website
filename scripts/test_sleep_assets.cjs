// Compare the public manifest with the user's two in-game reference screenshots.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '../pokemon-sleep');
const assets = vm.runInNewContext(fs.readFileSync(path.join(root, 'asset-data.js'), 'utf8') + '\nsleepAssets;');
assert.equal(assets.subskills['Helping Speed M'], 'silver');
assert.equal(assets.subskills['Ingredient Finder M'], 'silver');
assert.equal(assets.subskills['Inventory Up S'], 'normal');
assert.equal(assets.subskills['Skill Trigger S'], 'normal');
assert.equal(assets.subskills['Sleep EXP Bonus'], 'gold');
assert.equal(assets.subskills['Unknown skill'], undefined);
const roster = JSON.parse(fs.readFileSync(path.join(root, 'roster.json'))).records;
for (const mon of roster) {
    if (mon.berry) assert.ok(assets.berries[mon.berry], mon.berry);
    for (const slot of mon.ingredients) if (slot.name) assert.ok(assets.ingredients[slot.name], slot.name);
    for (const slot of mon.subskills) if (slot.name) assert.ok(assets.subskills[slot.name], slot.name);
}
for (const category of ['berries', 'ingredients', 'specialties']) {
    for (const file of Object.values(assets[category])) {
        const data = fs.readFileSync(path.join(root, 'assets', file));
        assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', file);
    }
}
console.log('Asset coverage, PNG files, screenshot rarity references, and unknown fallback verified.');
