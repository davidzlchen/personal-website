// Import an esbuild-bundled Neroli's Lab data entry; never imports account data.
const fs = require('node:fs');
const path = require('node:path');
const { COMPLETE_POKEDEX, NATURES, subskills } = require(path.resolve(process.argv[2]));
const commit = process.argv[3];
if (!/^[a-f0-9]{40}$/.test(commit || '')) throw Error('Supply the source commit SHA');
const data = {
    source: { name: "Neroli’s Lab", url: 'https://github.com/nerolis-lab/nerolis-lab', commit,
        imported_at: new Date().toISOString().slice(0, 10), license: 'Apache-2.0',
        rates_credit: 'Mathcord RP data project; see upstream types/pokemon/pokemon.ts' },
    natures: NATURES.map(n => ({ name: n.name, label: n.prettyName, speed: 2 - n.frequency,
        ingredient: n.ingredient, skill: n.skill, energy: n.energy })),
    subskills: subskills.SUBSKILLS.map(s => s.name),
    unsupported: COMPLETE_POKEDEX.filter(p => p.specialty === 'all').map(p => p.displayName),
    species: COMPLETE_POKEDEX.filter(p => p.specialty !== 'all').map(p => ({ key: p.name, name: p.displayName, dex: p.pokedexNumber,
        specialty: p.specialty, frequency: p.frequency, ingredientRate: p.ingredientPercentage / 100,
        skillRate: p.skillPercentage / 100, berry: p.berry.name.charAt(0) + p.berry.name.slice(1).toLowerCase() + ' Berry',
        carry: p.carrySize, remainingEvolutions: p.remainingEvolutions, pity: p.pityProcThreshold,
        skill: p.skill.name || `${p.skill.baseSkill.name} (${p.skill.modifierName})`, ingredients: [p.ingredient0, p.ingredient30, p.ingredient60].map(options =>
            options.filter(o => o.amount > 0).map(o => ({ name: o.ingredient.longName, quantity: o.amount })))
    })).sort((a,b) => a.name.localeCompare(b.name))
};
for (const p of data.species) {
    if (!(p.frequency > 0 && p.carry > 0 && p.ingredientRate >= 0 && p.ingredientRate <= 1 &&
        p.skillRate >= 0 && p.skillRate <= 1 && p.ingredients.every(s => s.length && s.every(o => o.quantity > 0))))
        throw Error('Invalid species: ' + p.key);
}
fs.writeFileSync(path.join(__dirname, '../pokemon-sleep/analyzer/data.json'), JSON.stringify(data, null, 2) + '\n');
console.log(`Imported ${data.species.length} species, ${data.natures.length} natures from ${commit}`);
