/* Automatic estimates for the selected, dated helper. No account requests or writes. */
(function (root) {
    'use strict';
    let catalog;
    const results = new WeakMap();
    let selectedIsland = SleepIslands.get(new URLSearchParams(location.search).get('island')).id;
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
    function panel(mon, snapshotId, inventory) {
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
        const controls = make('div', null, 'detail-island-controls');
        const islandId=selectedIsland;
        const islandLabel=make('div',null,'detail-selected-island');
        islandLabel.append(make('span','Analyzing at'),make('strong',SleepIslands.get(islandId).name));
        const changeIsland=make('button','Change island','detail-change-island'); changeIsland.type='button';
        changeIsland.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('sleep:choose-island')));
        islandLabel.append(changeIsland);
        const areaLabel=make('label','Area bonus (%)'), area=make('input');
        area.id='detail-area'; area.type='number'; area.min=0;area.max=100;area.step=1; area.value=SleepIslands.savedBonus(islandId,inventory) ?? 0;areaLabel.append(area);
        const favoriteLabel=make('label',null,'detail-island-favorite'), favorite=make('input');
        favorite.id='detail-favorite'; favorite.type='checkbox';favoriteLabel.append(favorite,make('span','This helper’s berry is a weekly favorite (×2)'));
        const islandNote=make('p',null,'detail-production-note');
        controls.append(islandLabel,areaLabel,favoriteLabel,islandNote);
        section.append(heading,controls,status,link);
        let render;
        function updateIsland() {
            const fixed=SleepIslands.favorite(islandId,mon.berry);
            favorite.disabled=fixed!==null;
            if(fixed!==null) favorite.checked=fixed;
            islandNote.textContent=SleepIslands.note(islandId,inventory,area.value);
            url.searchParams.set('island',islandId);url.searchParams.set('area',area.value);
            url.searchParams.set('favorite-berry',favorite.checked?'1':'0');
            link.href=url.pathname+url.search;
            if(render) render();
        }
        area.addEventListener('input',()=>updateIsland());
        favorite.addEventListener('change',()=>updateIsland());
        updateIsland();
        loadCatalog().then(data => {
            if (!section.isConnected) return; // A different helper or snapshot may already be selected.
            const build = SleepAnalyzer.fromRoster(data, mon);
            let result = results.get(mon);
            if (!result) {
                result = SleepAnalyzer.simulate(build, SleepAnalyzer.defaultConditions);
                results.set(mon, result);
            }
            render=()=>{
                section.querySelectorAll('.detail-production-cards,.practical-cards').forEach(n=>n.remove());
                status.hidden=false;
                if(area.value==='' || !area.checkValidity()) { status.textContent='Enter an area bonus from 0 to 100%.'; return; }
                const conditions={...SleepAnalyzer.defaultConditions,areaBonus:+area.value,favoriteBerry:favorite.checked,islandName:islandId==='custom'?'':SleepIslands.get(islandId).name};
                const outcome = SleepOutcomes.evaluate(build, result, conditions);
                const cards = make('div', null, 'detail-production-cards');
                const entries=[['Berries', result.berries + outcome.skillBerries, 'berries', mon.berry],
                    ...Object.entries(result.ingredients).map(([name,value])=>[name,value,'ingredients',name]),
                    ['Skill triggers', result.triggers, 'specialties', 'Skills']];
                // Random skill ingredients cannot be assigned to a particular ingredient.
                if(outcome.extraIngredients) entries.splice(entries.length-1,0,['Random skill ingredients',outcome.extraIngredients,'specialties','Ingredients']);
                for (const [label, value, category, name] of entries) {
                    const card = make('div', null, 'detail-production-card');
                    card.classList.add(category==='ingredients'?'detail-ingredient-card':category==='specialties'&&name==='Skills'?'detail-skill-card':'detail-berry-card');
                    const path = sleepAssets[category]?.[name];
                    if (path) { const icon = make('img'); icon.src = '/pokemon-sleep/assets/' + path; icon.alt = ''; card.append(icon); }
                    card.append(make('strong', decimal(value)), make('span', label));
                    cards.append(card);
                }
                const rewards=make('div',null,'practical-cards');
                for(const [label,value] of [[outcome.directComplete?'Direct Snorlax strength':'Berry strength only',outcome.directStrength],['Skill Dream Shards',outcome.dreamShards]]) {
                    const card=make('div',null,'practical-card');
                    card.append(make('strong',value===null?'Not modeled':value.toLocaleString('en-US',{maximumFractionDigits:0})),make('span',label+' / day'));
                    rewards.append(card);
                }
                section.insertBefore(cards,status);
                section.insertBefore(rewards,status);
                status.hidden=true;
            };
            render();
        }).catch(error => {
            if (section.isConnected) status.textContent = error.message;
        });
        return section;
    }
    root.SleepDetailProduction = { panel, selectedIsland:()=>selectedIsland, selectIsland:id=>{selectedIsland=SleepIslands.get(id).id;} };
})(globalThis);
