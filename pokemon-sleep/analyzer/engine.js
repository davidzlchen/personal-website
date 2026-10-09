/* Independent production estimator. Mechanics/data references: ./NOTICE.txt and index.html. */
(function (root) {
    'use strict';
    const clamp = (x, low, high) => Math.min(high, Math.max(low, x));
    const energyFactor = e => e >= 80 ? .45 : e >= 60 ? .52 : e >= 40 ? .58 : e > 0 ? .66 : 1;
    function stats(build, conditions) {
        const p = build.species;
        const skills = new Set(build.subskills.filter(s => s.unlock <= build.level).map(s => s.name));
        const has = name => skills.has(name);
        const nature = build.nature;
        if (!nature) throw Error('Choose a known nature before calculating.');
        if (build.ingredients.some(s => !s || !s.name || !(s.quantity > 0))) throw Error('Choose all three ingredient slots.');
        const speed = Math.max(.65, 1 - (has('Helping Speed S') ? .07 : 0) - (has('Helping Speed M') ? .14 : 0)
            - .05 * Math.min(5, conditions.helpingBonus + (has('Helping Bonus') ? 1 : 0)));
        const ribbonSpeed = conditions.ribbon >= 500 ? p.remainingEvolutions === 2 ? .89 : p.remainingEvolutions === 1 ? .95 : 1 : 1;
        const maxRibbonSpeed = conditions.ribbon >= 2000 ? p.remainingEvolutions === 2 ? .75 : p.remainingEvolutions === 1 ? .88 : 1 : ribbonSpeed;
        const multiplier = nature.speed * speed * (1 - .002 * (build.level - 1)) * maxRibbonSpeed;
        const frequency = Math.floor(Math.round(multiplier * 10000) / 10000 * p.frequency / (conditions.camp ? 1.2 : 1));
        const capacityBonus = (has('Inventory Up S') ? 6 : 0) + (has('Inventory Up M') ? 12 : 0) + (has('Inventory Up L') ? 18 : 0);
        const ribbonCarry = conditions.ribbon >= 2000 ? 8 : conditions.ribbon >= 1000 ? 6 : conditions.ribbon >= 500 ? 3 : conditions.ribbon >= 200 ? 1 : 0;
        const capacity = Math.ceil((build.carry + capacityBonus + ribbonCarry) * (conditions.camp ? 1.2 : 1));
        const ingredients = build.ingredients.filter((s,i) => build.level >= [1,30,60][i]);
        return {
            frequency, capacity, ingredients,
            ingredientRate: clamp(p.ingredientRate * nature.ingredient * (1 + (has('Ingredient Finder S') ? .18 : 0) + (has('Ingredient Finder M') ? .36 : 0)), 0, 1),
            skillRate: clamp(p.skillRate * nature.skill * (1 + (has('Skill Trigger S') ? .18 : 0) + (has('Skill Trigger M') ? .36 : 0)), 0, 1),
            berriesPerHelp: (p.specialty === 'berry' ? 2 : 1) + (has('Berry Finding S') ? 1 : 0),
            bankLimit: p.specialty === 'skill' ? 2 : 1, pity: p.pity,
        };
    }
    // Integrate one day in one-minute steps. Energy presets describe a scenario,
    // not a prediction of healer skills, meals, sleep recovery, or the player's routine.
    function schedule(s, c) {
        const bedtime = (24 - c.sleepHours) * 60;
        const helps = [], collections = [];
        for (let t = c.collectHours * 60; t < bedtime; t += c.collectHours * 60) collections.push(t);
        if (bedtime > 0) collections.push(bedtime); // Empty inventory immediately before bed.
        collections.push(1440); // Collect everything on waking.
        let progress = 0;
        for (let minute = 0; minute < 1440; minute++) {
            const e = c.energy === 'high' ? 100 : c.energy === 'zero' ? 0 : Math.max(0, 100 - minute / 6);
            const rate = 60 / (s.frequency * energyFactor(e));
            const next = progress + rate;
            for (let n = 1; n <= Math.floor(next); n++) helps.push(minute + (n - progress) / rate);
            progress = next % 1;
        }
        return { helps, collections };
    }
    function rng(seed) {
        return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
            n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
            return ((n ^ n >>> 14) >>> 0) / 4294967296;
        };
    }
    function simulate(build, conditions, days = 4000) {
        const s = stats(build, conditions), times = schedule(s, conditions);
        const random = rng(0x534c4545);
        const totals = { berries: 0, sneaky: 0, triggers: 0, ingredients: {}, fullHours: 0 };
        for (const slot of s.ingredients) totals.ingredients[slot.name] = 0;
        let misses = 0; // Pity persists across collections and day boundaries.
        for (let day = -20; day < days; day++) {
            let carried = 0, bank = 0, collection = 0, fullSince = null;
            const count = day >= 0;
            function collect(t) {
                if (count) {
                    totals.triggers += bank;
                    if (fullSince !== null) totals.fullHours += (t - fullSince) / 60;
                }
                carried = 0; bank = 0; fullSince = null;
            }
            for (const time of times.helps) {
                while (time > times.collections[collection]) collect(times.collections[collection++]);
                if (carried >= s.capacity) {
                    if (count) { totals.berries += s.berriesPerHelp; totals.sneaky += s.berriesPerHelp; }
                    continue;
                }
                if (random() < s.ingredientRate) {
                    const slot = s.ingredients[Math.floor(random() * s.ingredients.length)];
                    const amount = Math.min(slot.quantity, s.capacity - carried);
                    carried += amount;
                    if (count) totals.ingredients[slot.name] += amount;
                } else {
                    const amount = Math.min(s.berriesPerHelp, s.capacity - carried);
                    carried += amount;
                    if (count) totals.berries += amount;
                }
                if (bank < s.bankLimit) {
                    misses++;
                    if (misses > s.pity || random() < s.skillRate) { bank++; misses = 0; }
                }
                if (carried >= s.capacity && fullSince === null) fullSince = time;
            }
            while (collection < times.collections.length) collect(times.collections[collection++]);
        }
        for (const k of ['berries','sneaky','triggers','fullHours']) totals[k] /= days;
        for (const k of Object.keys(totals.ingredients)) totals.ingredients[k] /= days;
        return { ...totals, totalIngredients: Object.values(totals.ingredients).reduce((a,b)=>a+b,0), helps: times.helps.length, stats: s, days };
    }
    const api = { stats, simulate, energyFactor, schedule };
    if (typeof module !== 'undefined') module.exports = api;
    else root.SleepAnalyzer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
