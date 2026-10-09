(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const el = (tag, text, className) => {
        const n = document.createElement(tag);
        if (text !== undefined) n.textContent = text;
        if (className) n.className = className;
        return n;
    };
    const decimal = n => n.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    const integer = n => n.toLocaleString('en-US');
    const options = (select, entries, value) => {
        select.replaceChildren(...entries.map(([v,t]) => { const o = el('option',t); o.value = v; return o; }));
        if (value !== undefined && entries.some(([v]) => String(v) === String(value))) select.value = value;
    };
    const params = new URLSearchParams(location.search);
    let data, roster = [], capturedAt, species, result, resultLabel, comparison, timer;
    let unlocks = [10,25,50,75,100];
    let snapshotFailed = false;
    
    function icon(category, name) {
        const path = sleepAssets[category]?.[name];
        if (!path) return null;
        const image = el('img'); image.src = '/pokemon-sleep/assets/' + path; image.alt = '';
        image.addEventListener('error',()=>image.hidden=true,{once:true});
        return image;
    }
    function speciesMatch(mon) {
        if (mon.variant === 'Costume') return null; // The roster does not identify which costume.
        return data.species.find(p => p.dex === mon.national_dex && (mon.variant === 'Paldean'
            ? p.key.endsWith('_PALDEAN') : p.name === mon.species));
    }
    function fields() {
        $('ingredient-fields').replaceChildren();
        for (let i=0; i<3; i++) {
            const label = el('label', `Ingredient · Lv. ${[1,30,60][i]}`, 'field field-wide');
            const select = el('select'); select.id = 'ingredient-' + i;
            options(select, species.ingredients[i].map((s,j)=>[j,`${s.name} ×${s.quantity}`]));
            label.append(select); $('ingredient-fields').append(label);
        }
        $('subskill-fields').replaceChildren();
        for (let i=0; i<5; i++) {
            const label = el('label', `Subskill · Lv. ${unlocks[i]}`, 'field' + (i===4?' field-wide':''));
            const select = el('select'); select.id = 'subskill-' + i;
            options(select, [['','None'],...data.subskills.map(s=>[s,s])]);
            label.append(select); $('subskill-fields').append(label);
        }
        $('unlock-note').textContent = unlocks[3] === 70
            ? 'Saved helper unlock levels follow this dated collection (70 / 80). Custom builds use 75 / 100.'
            : 'Level 75 and 100 subskills are future projections.';
    }
    function resetSpecies() {
        species = data.species.find(p=>p.key===$('species').value);
        unlocks = [10,25,50,75,100];
        $('carry').value = species.carry;
        fields();
        $('saved').value = '';
        $('saved-note').textContent = 'Custom build. Set the base carry limit to match your helper before calculating.';
    }
    function applySaved() {
        const mon = roster.find(m=>m.id===$('saved').value);
        if (!mon) { resetSpecies(); return; }
        const match = speciesMatch(mon);
        if (!match) { $('calculation-status').textContent='This helper’s form is not identified or supported. Choose an exact species to create a custom build.'; $('results').hidden=true; return; }
        species = match; $('species').value=match.key; $('level').value=mon.level;
        $('nature').value=mon.nature_neutralized ? 'Hardy' : mon.nature;
        // Carry and ribbon are absent from the public export; do not infer evolution history.
        $('carry').value=match.carry;
        unlocks = mon.subskills.length === 5 ? mon.subskills.map(s=>s.unlock_level) : [10,25,50,75,100];
        fields();
        const missing = [];
        for (let i=0;i<3;i++) {
            const slot=mon.ingredients[i];
            const idx=match.ingredients[i].findIndex(s=>s.name===slot?.name && s.quantity===slot?.quantity);
            if (idx>=0) $('ingredient-'+i).value=idx;
            else { const o=el('option','Choose ingredient — saved slot unavailable'); o.value=''; $('ingredient-'+i).prepend(o); $('ingredient-'+i).value=''; missing.push('ingredient slot'); }
        }
        for (let i=0;i<5;i++) $('subskill-'+i).value=data.subskills.includes(mon.subskills[i]?.name)?mon.subskills[i].name:'';
        $('saved-note').textContent=`Snapshot: ${capturedAt}. Carry limit and ribbon aren’t recorded; confirm them below.${missing.length ? ' Some ingredient slots need your selection.' : ''}`;
        calculate();
    }
    function readBuild() {
        const saved = roster.find(m=>m.id===$('saved').value);
        if (saved && !speciesMatch(saved)) throw Error('Choose the exact form for this helper before calculating.');
        if (!$('build-form').checkValidity()) throw Error('Enter valid values for level, carry limit, and sleep hours.');
        const names = Array.from({length:5},(_,i)=>$('subskill-'+i).value).filter(Boolean);
        if (new Set(names).size !== names.length) throw Error('Each subskill can appear only once.');
        return {
            species, level: +$('level').value, carry: +$('carry').value,
            nature: data.natures.find(n=>n.name===$('nature').value),
            ingredients: species.ingredients.map((s,i)=>$('ingredient-'+i).value==='' ? null : s[+$('ingredient-'+i).value]),
            subskills: Array.from({length:5},(_,i)=>({name:$('subskill-'+i).value,unlock:unlocks[i]}))
        };
    }
    function conditions() {
        return { sleepHours:+$('sleep').value, collectHours:+$('collect').value, energy:$('energy').value,
            helpingBonus:+$('bonus').value, ribbon:+$('ribbon').value, camp:$('camp').checked };
    }
    function paintHeading(build) {
        const image=el('img'); image.alt='';
        image.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${species.key==='WOOPER_PALDEAN'?10253:species.dex}.png`;
        const title=el('div'); title.append(el('h2',species.name),el('p',`Lv. ${build.level} · ${build.nature?.name || 'Choose nature'} · ${species.skill}`));
        $('result-heading').replaceChildren(image,title);
    }
    function paintResults() {
        const cards=$('production-cards'); cards.replaceChildren();
        for (const [name,value,category,key] of [['Berries',result.berries,'berries',species.berry],
            ['Ingredients',result.totalIngredients,'specialties','Ingredients'],['Skill triggers',result.triggers,'specialties','Skills']]) {
            const card=el('div',undefined,'production-card'),image=icon(category,key);
            if (image) card.append(image);
            card.append(el('strong',decimal(value)),el('span',name)); cards.append(card);
        }
        $('ingredient-results').replaceChildren();
        for (const [name,value] of Object.entries(result.ingredients)) {
            const row=el('div',undefined,'ingredient-result'),image=icon('ingredients',name);
            if(image)row.append(image);
            row.append(el('span',name),el('strong',decimal(value))); $('ingredient-results').append(row);
        }
        $('mechanics-results').replaceChildren();
        const s=result.stats;
        for (const [name,value] of [['Help interval at 0 energy',`${Math.floor(s.frequency/60)}m ${s.frequency%60}s`],
            ['Helps per day',integer(result.helps)],['Ingredient chance / help',decimal(s.ingredientRate*100)+'%'],
            ['Skill chance / eligible help',decimal(s.skillRate*100)+'%'],['Effective carry limit',integer(s.capacity)],
            ['Berries from sneaky snacking',decimal(result.sneaky)],['Time with full inventory',decimal(result.fullHours)+' h'],
            ['Skills that can be stored',s.bankLimit]]) {
            const row=el('div',undefined,'mechanic-row');row.append(el('dt',name),el('dd',String(value))); $('mechanics-results').append(row);
        }
        $('results').hidden=false; paintComparison();
    }
    function paintComparison() {
        $('comparison').hidden=!comparison;
        if(!comparison)return;
        const delta=n=>(n>=0?'+':'')+decimal(n);
        $('comparison').replaceChildren(el('h3','Compared with '+comparison.label),
            el('p',`Berries ${delta(result.berries-comparison.berries)} · Ingredients ${delta(result.totalIngredients-comparison.totalIngredients)} · Skill triggers ${delta(result.triggers-comparison.triggers)} per day`));
        const clear=el('button','Clear comparison','text-button'); clear.type='button';
        clear.addEventListener('click',()=>{comparison=null;paintComparison();}); $('comparison').append(clear);
    }
    function calculate() {
        clearTimeout(timer);
        try {
            const build=readBuild(); paintHeading(build);
            const active = +$('level').value;
            for(let i=0;i<3;i++) $('ingredient-'+i).parentElement.classList.toggle('slot-inactive', active<[1,30,60][i]);
            for(let i=0;i<5;i++) $('subskill-'+i).parentElement.classList.toggle('slot-inactive', active<unlocks[i]);
            result=SleepAnalyzer.simulate(build,conditions());
            resultLabel=`${species.name} · Lv. ${build.level} · ${build.nature.name}`;
            $('calculation-status').textContent=''; paintResults();
        } catch(error) { $('calculation-status').textContent=error.message; $('results').hidden=true; }
    }
    function buildUrl() {
        const url=new URL('https://davidzlchen.com/pokemon-sleep/analyzer/');
        url.searchParams.set('species',species.key);
        for(const id of ['level','carry','nature','sleep','collect','energy','bonus','ribbon']) url.searchParams.set(id,$(id).value);
        url.searchParams.set('camp',$('camp').checked?'1':'0');
        url.searchParams.set('ingredients',Array.from({length:3},(_,i)=>$('ingredient-'+i).value).join(','));
        url.searchParams.set('subskills',Array.from({length:5},(_,i)=>$('subskill-'+i).value).join(','));
        url.searchParams.set('unlocks',unlocks.join(','));
        return url;
    }
    function restoreUrl() {
        if (!params.has('species')) return;
        const p=data.species.find(s=>s.key===params.get('species'));
        if (!p) throw Error('This shared build has an unknown species.');
        $('species').value=p.key; resetSpecies();
        for(const id of ['level','carry','nature','sleep','collect','energy','bonus','ribbon']) if(params.has(id)) $(id).value=params.get(id);
        $('camp').checked=params.get('camp')==='1';
        const thresholds=params.get('unlocks')?.split(',').map(Number);
        if(thresholds && [[10,25,50,75,100],[10,25,50,70,80]].some(a=>a.every((n,i)=>n===thresholds[i])&&thresholds.length===5)) { unlocks=thresholds; fields(); }
        params.get('ingredients')?.split(',').forEach((v,i)=>{if(i<3)$('ingredient-'+i).value=v;});
        params.get('subskills')?.split(',').forEach((v,i)=>{if(i<5)$('subskill-'+i).value=v;});
    }
    async function getJson(url) {
        const response=await fetch(url,{cache:'no-cache'});
        if(!response.ok)throw Error('Could not load '+url);
        return response.json();
    }
    async function init() {
        try {
            const results=await Promise.allSettled([getJson('/pokemon-sleep/analyzer/data.json'),getJson('/pokemon-sleep/roster.json')]);
            if(results[0].status==='rejected')throw results[0].reason;
            data=results[0].value;
            let savedData=results[1].status==='fulfilled'?results[1].value:null;
            if(params.has('snapshot')) {
                try {
                    const history=await getJson('/pokemon-sleep/history.json');
                    const snap=history.snapshots.find(s=>s.id===params.get('snapshot'));
                    if(!snap || !/^snapshots\/[a-z0-9-]+\.json$/.test(snap.file))throw Error('Snapshot unavailable.');
                    const archived=await getJson('/pokemon-sleep/'+snap.file);
                    savedData=archived.roster; 
                } catch { snapshotFailed=true; $('load-status').textContent='That snapshot could not be loaded. Choose a helper from the latest collection, or try a custom build.'; }
            }
            roster=savedData?.records || []; capturedAt=savedData?.captured_at;
            options($('species'),data.species.map(p=>[p.key,p.name]),'AMPHAROS');
            options($('nature'),[['','Choose a nature'],...data.natures.map(n=>[n.name,n.label])],'Hardy');
            options($('saved'),[['','Custom build'],...roster.map(m=>[m.id,`${m.nickname || m.species} · ${m.species} · Lv. ${m.level}${speciesMatch(m)?'':' (form unavailable)'}`])]);
            $('data-version').textContent=`Data imported ${data.source.imported_at}, source revision ${data.source.commit.slice(0,7)}.`;
            resetSpecies();
            if(params.has('species'))restoreUrl();
            else if(!snapshotFailed&&params.has('pokemon')&&roster.some(m=>m.id===params.get('pokemon'))) { $('saved').value=params.get('pokemon'); applySaved(); }
            else calculate();
            if(!$('load-status').textContent.startsWith('That snapshot')) $('load-status').textContent=roster.length?'': 'Saved helpers are unavailable. Custom builds still work.';
            $('analyzer-workspace').hidden=false;
            calculate();
        } catch(error) { $('load-status').textContent=`The analyzer could not load. ${error.message} Please reload to try again.`; }
    }
    $('build-form').addEventListener('submit',event=>{
        event.preventDefault(); calculate();
        if (!$('results').hidden && matchMedia('(max-width: 850px)').matches)
            $('result-heading').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    });
    $('build-form').addEventListener('change',event=>{
        if(event.target.id==='saved') { applySaved(); return; }
        if(event.target.id==='species')resetSpecies();
        calculate();
    });
    $('build-form').addEventListener('input',event=>{
        if(event.target.tagName!=='INPUT')return;
        $('results').hidden=true;
        clearTimeout(timer); timer=setTimeout(calculate,200);
    });
    $('reset-build').addEventListener('click',()=>{
        $('build-form').reset(); $('species').value='AMPHAROS'; $('nature').value='Hardy'; resetSpecies(); calculate();
    });
    $('pin').addEventListener('click',()=>{comparison={...result,label:resultLabel};paintComparison();});
    $('share').addEventListener('click',async()=>{
        try{await navigator.clipboard.writeText(buildUrl().href);$('share').textContent='Link copied';}
        catch{const url=buildUrl(); if(params.get('analytics')==='off')url.searchParams.set('analytics','off'); history.replaceState(null,'',url.pathname+url.search);$('share').textContent='Copy the address bar link';}
    });
    init();
})();
