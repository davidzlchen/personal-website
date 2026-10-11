/* Practical effect quantities from the locally credited public species catalog. */
(function (root) {
    'use strict';
    const fmt = n => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
    function evaluate(build, result, conditions = {}) {
        const effect = build.species.effect;
        const index = build.skillLevel - 1;
        const levelKnown = Number.isInteger(build.skillLevel) && index >= 0 && index < (effect?.maxLevel || 0);
        const at = key => levelKnown ? effect[key]?.[index] : undefined;
        const area = 1 + (conditions.areaBonus || 0) / 100;
        const berryValue = Math.round(Math.max(build.species.berryValue + build.level - 1,
            build.species.berryValue * Math.pow(1.025, build.level - 1)));
        const berryStrength = result.berries * berryValue * (conditions.favoriteBerry ? 2 : 1) * area;
        const ingredientValues = Object.fromEntries(build.ingredients.map(s => [s.name, s.value]));
        const ingredientBaseValue = Object.entries(result.ingredients).reduce((sum,[name,count]) => sum + count * (ingredientValues[name] || 0), 0);
        let skillStrength = 0, dreamShards = 0, extraIngredients = 0, skillBerries = 0;
        let perTrigger = '', perDay = '', caveat = '', complete = levelKnown;
        const name = effect?.name || build.species.skill;
        const daily = value => fmt(value * result.triggers);
        if (!levelKnown) {
            complete = false; perTrigger = 'The effective main skill level is unavailable. Confirm it in the analyzer to estimate its benefit.';
        } else if (name === 'Charge Strength M' || name === 'Charge Strength S') {
            const mean = at('strengthAmounts') ?? at('strengthAmountsMean');
            skillStrength = mean * result.triggers * area;
            perTrigger = at('strengthAmountsLow') !== undefined
                ? `Adds ${fmt(at('strengthAmountsLow') * area)}–${fmt(at('strengthAmountsHigh') * area)} Snorlax strength per trigger (average ${fmt(mean * area)}).`
                : `Adds ${fmt(mean * area)} Snorlax strength per trigger.`;
            perDay = `About ${fmt(skillStrength)} strength per day from this skill.`;
        } else if (name === 'Dream Shard Magnet S' || effect.modifier === 'Aura Sphere') {
            const mean = at('shardAmounts') ?? at('shardAmountsMean');
            dreamShards = mean * result.triggers;
            perTrigger = at('shardAmountsLow') !== undefined
                ? `Gives ${fmt(at('shardAmountsLow'))}–${fmt(at('shardAmountsHigh'))} Dream Shards per trigger (average ${fmt(mean)}).`
                : `Gives ${fmt(mean)} Dream Shards per trigger.`;
            perDay = `About ${fmt(dreamShards)} skill-generated Dream Shards per day.`;
            if (effect.modifier === 'Aura Sphere') {
                skillStrength = at('strengthAmounts') * result.triggers * area;
                perTrigger += ` Also adds ${fmt(at('strengthAmounts') * area)} Snorlax strength.`;
                perDay += ` Plus ${fmt(skillStrength)} direct strength.`;
            }
        } else if (name === 'Charge Energy S' || name === 'Energy For Everyone S' || name === 'Energizing Cheer S') {
            const amount = at('energyAmounts');
            const target = name === 'Charge Energy S' ? 'this helper' : name === 'Energy For Everyone S' ? 'each team member' : 'one teammate';
            perTrigger = `Restores ${fmt(amount)} energy to ${target} per trigger.`;
            perDay = `About ${daily(amount)} energy per day ${name === 'Energy For Everyone S' ? 'for each team member' : 'to that target'}, before recovery modifiers and energy caps.`;
            caveat = 'This recovery is not fed back into the production simulation; a healer or self-healer can produce more than the fading-energy scenario suggests.';
        } else if (name === 'Ingredient Magnet S' || name === 'Ingredient Draw S') {
            const amount = at('ingredientAmounts'); extraIngredients = amount * result.triggers;
            perTrigger = `Gives ${fmt(amount)} ${effect.ingredient || 'random ingredients'} per trigger.`;
            perDay = `About ${fmt(extraIngredients)} extra ingredients per day, in addition to regular gathering.`;
            if (!effect.ingredient) caveat = name === 'Ingredient Magnet S' ? 'The skill’s ingredient mix depends on your unlocked ingredient pool; it is not assigned to the named gathering slots.' : 'This skill picks one ingredient type from its species-specific selection; it is not assigned to the named gathering slots.';
        } else if (name === 'Berry Burst') {
            skillBerries = at('selfBerryAmounts') * result.triggers;
            skillStrength = skillBerries * berryValue * (conditions.favoriteBerry ? 2 : 1) * area;
            perTrigger = `Gives ${fmt(at('selfBerryAmounts'))} of this helper’s berries plus ${fmt(at('teamBerryAmounts'))} berries from each other team member per trigger.`;
            perDay = `About ${fmt(skillBerries)} extra berries from this helper (${fmt(skillStrength)} strength per day).`;
            caveat = 'Other teammates’ berry strength requires their species, levels, and favorite-berry settings; it is excluded from the direct strength total.';
        } else if (name === 'Cooking Power-Up S') {
            perTrigger = `Adds ${fmt(at('potSizeAmounts'))} ingredient slots to the next cooking pot per trigger.`;
            perDay = `About ${daily(at('potSizeAmounts'))} pot slots generated per day, before the pot-size cap and cooking schedule.`;
            caveat = 'Extra capacity creates strength only when you cook with it; it is not counted as direct strength.';
        } else if (name === 'Tasty Chance S') {
            perTrigger = `Adds ${fmt(at('chanceAmounts'))} percentage points to the Extra Tasty chance per trigger.`;
            perDay = `About ${daily(at('chanceAmounts'))} percentage points generated per day before chance caps and cooking resets.`;
            caveat = 'This is not the final dish probability. Recipe, timing, and resets determine the cooking benefit.';
        } else if (name === 'Extra Helpful S') {
            perTrigger = `Makes a teammate help ${fmt(at('helpAmounts'))} extra times per trigger.`;
            perDay = `About ${daily(at('helpAmounts'))} extra teammate helps per day.`;
            caveat = 'The berries, ingredients, and strength from these helps depend on the target teammate and are excluded here.';
        } else {
            complete = false;
            perTrigger = 'This special skill depends on team composition, copied skills, or additional random outcomes.';
            caveat = 'Its full effect is not modeled here. Only the helper’s regular berry strength is shown; unmodeled Dream Shards are not treated as zero.';
        }
        return { berryValue, berryStrength, skillStrength: complete ? skillStrength : null,
            directStrength: berryStrength + skillStrength, directComplete: complete,
            dreamShards: complete ? dreamShards : null, ingredientBaseValue, extraIngredients, skillBerries,
            perTrigger, perDay, caveat, skillLevel: levelKnown ? build.skillLevel : null, skillName: name };
    }
    const api = { evaluate };
    if (typeof module !== 'undefined') module.exports = api;
    else root.SleepOutcomes = api;
})(globalThis);
