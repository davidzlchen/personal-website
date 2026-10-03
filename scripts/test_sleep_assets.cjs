// Compare the public manifest with the user's two in-game reference screenshots.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
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
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'inventory.json')));
for (const entry of inventory.entries) {
    if (entry.name && entry.category !== 'Ingredients') assert.ok(assets.items[entry.name], entry.name);
}
for (const candy of Object.values(inventory.pokemon_candies)) {
    if (candy.name) assert.ok(assets.items[candy.name], candy.name);
}
assert.equal(assets.items['Mareep Candy'], 'items/candy-179.webp');
assert.equal(assets.items['Aron Candy'], 'items/candy-304.webp');
assert.equal(assets.items['Latias Candy'], 'items/candy-380.webp');
assert.equal(assets.items['Poké Biscuit'], 'items/item-9.webp');
assert.equal(assets.items['Unknown item'], undefined);
for (const category of ['berries', 'ingredients', 'specialties', 'items']) {
    for (const file of Object.values(assets[category])) {
        const data = fs.readFileSync(path.join(root, 'assets', file));
        if (file.endsWith('.webp')) {
            assert.equal(data.subarray(0, 4).toString(), 'RIFF', file);
            assert.equal(data.subarray(8, 12).toString(), 'WEBP', file);
        } else assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', file);
    }
}
console.log('Asset coverage, PNG files, screenshot rarity references, and unknown fallback verified.');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'assets/inventory-sources.json')));
for (const source of sources.files) {
    const bytes = fs.readFileSync(path.join(root, 'assets', source.file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), source.sha256, source.file);
}
console.log(`Verified ${sources.files.length} candy/item artwork checksums and inventory name coverage.`);
