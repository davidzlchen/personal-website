/* Automatic estimates for the selected, dated helper. No account requests or writes. */
(function (root) {
    'use strict';
    let catalog;
    const results = new WeakMap();
    const make = (tag, text, className) => {
        const element = document.createElement(tag);
        if (text != null) element.textContent = text;
        if (className) element.className = className;
        return element;
    };
    const decimal = value => value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    function loadCatalog() {
        if (!catalog) catalog = fetch('/pokemon-sleep/analyzer/data.json', { cache: 'no-cache' }).then(response => {
            if (!response.ok) throw Error('Production estimates could not load. Reopen this helper to try again.');
            return response.json();
        }).catch(error => { catalog = null; throw error; });
        return catalog;
    }
    function panel(mon, snapshotId) {
        const section = make('section', null, 'detail-production');
        const heading = make('div', null, 'detail-production-heading');
        heading.append(make('h3', 'Expected daily production'), make('span', 'Per 24 hours', 'detail-production-period'));
        const status = make('p', 'Calculating this helper’s daily haul…', 'detail-production-note');
        status.setAttribute('role', 'status');
        const link = make('a', 'Analyze this helper →', 'detail-analyze');
        const url = new URL('/pokemon-sleep/analyzer/', location.origin);
        url.searchParams.set('pokemon', mon.id);
        if (snapshotId) url.searchParams.set('snapshot', snapshotId);
        if (new URLSearchParams(location.search).get('analytics') === 'off') url.searchParams.set('analytics', 'off');
        link.href = url.pathname + url.search;
        link.title = 'Adjust this helper’s build and production assumptions';
        section.append(heading, status, link);
        loadCatalog().then(data => {
            if (!section.isConnected) return; // A different helper or snapshot may already be selected.
            const build = SleepAnalyzer.fromRoster(data, mon);
            let result = results.get(mon);
            if (!result) {
                result = SleepAnalyzer.simulate(build, SleepAnalyzer.defaultConditions);
                results.set(mon, result);
            }
            const outcome = SleepOutcomes.evaluate(build, result, SleepAnalyzer.defaultConditions);
            const cards = make('div', null, 'detail-production-cards');
            for (const [label, value, category, name] of [
                ['Berries', result.berries + outcome.skillBerries, 'berries', mon.berry],
                ['Ingredients', result.totalIngredients + outcome.extraIngredients, 'specialties', 'Ingredients'],
                ['Skill triggers', result.triggers, 'specialties', 'Skills'],
            ]) {
                const card = make('div', null, 'detail-production-card');
                const path = sleepAssets[category]?.[name];
                if (path) { const icon = make('img'); icon.src = '/pokemon-sleep/assets/' + path; icon.alt = ''; card.append(icon); }
                card.append(make('strong', decimal(value)), make('span', label));
                cards.append(card);
            }
            const ingredients = make('div', null, 'detail-production-ingredients');
            for (const [name, value] of Object.entries(result.ingredients)) {
                const row = make('div', null, 'detail-production-ingredient');
                row.append(make('span', name), make('strong', decimal(value)));
                ingredients.append(row);
            }
            const assumptions = make('details', null, 'detail-production-assumptions');
            assumptions.append(make('summary', 'Estimate assumptions'),
                make('p', `Uses this helper’s level, nature, unlocked ingredients, and subskills. Assumes 8.5 hours of sleep, collections every 3 waking hours plus bedtime and waking, and 100 energy fading by 10 per hour. Base carry is assumed to be ${build.carry}; evolution carry bonuses and sleep ribbons are not recorded.`),
                make('p', 'No camp or other Helping Bonus users. Includes inventory overflow, sneaky snacking, skill storage, and pity. Excludes meals, healing feedback, team-dependent skill effects, and event bonuses. Average of 4,000 simulated days; actual daily results vary.'),
                make('p', 'Species data: Neroli’s Lab / Mathcord RP data project. Full sources and adjustable settings are in the analyzer.'));
            status.textContent = 'Estimated from this saved build · includes modeled skill rewards';
            section.insertBefore(cards, status);
            section.insertBefore(ingredients, status);
            const practical = SleepPracticalOutput.panel(build, result, SleepAnalyzer.defaultConditions);
            // Keep all five daily totals together; explain their components below.
            section.insertBefore(practical.querySelector('.practical-cards'), ingredients);
            section.insertBefore(practical, link);
            section.insertBefore(assumptions, link);
        }).catch(error => {
            if (section.isConnected) status.textContent = error.message;
        });
        return section;
    }
    root.SleepDetailProduction = { panel };
})(globalThis);
