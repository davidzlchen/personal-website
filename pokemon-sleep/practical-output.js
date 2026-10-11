/* Shared practical benefit display for helper details and the custom analyzer. */
(function (root) {
    'use strict';
    const make = (tag,text,className) => { const n=document.createElement(tag); if(text!=null)n.textContent=text;if(className)n.className=className;return n; };
    const fmt = n => n.toLocaleString('en-US',{maximumFractionDigits:0});
    function panel(build, result, conditions) {
        const outcome = SleepOutcomes.evaluate(build,result,conditions);
        const section = make('section',null,'practical-output');
        section.append(make('h3','Power & rewards'));
        const cards=make('div',null,'practical-cards');
        for(const [label,value] of [[outcome.directComplete?'Direct Snorlax strength':'Berry strength only',fmt(outcome.directStrength)],
            ['Skill Dream Shards',outcome.dreamShards===null?'Not modeled':fmt(outcome.dreamShards)]]) {
            const card=make('div',null,'practical-card');card.append(make('strong',value),make('span',label+' / day'));cards.append(card);
        }
        section.append(cards);
        const breakdown=make('dl',null,'practical-breakdown');
        const rows=[['From regular berries',fmt(outcome.berryStrength)],['From main skill',outcome.skillStrength===null?'Not modeled':fmt(outcome.skillStrength)]];
        for(const [label,value] of rows){const row=make('div');row.append(make('dt',label),make('dd',value));breakdown.append(row);}
        section.append(breakdown,make('p',`${conditions.islandName ? conditions.islandName + ": strength" : "Strength"} assumes ${conditions.areaBonus || 0}% area bonus and ${conditions.favoriteBerry?'favorite berries (×2)':'no favorite-berry bonus'}. Cooking strength and teammates’ production are excluded.`,'practical-note'));
        section.append(make('h3',`${outcome.skillName}${outcome.skillLevel?' · Lv. '+outcome.skillLevel:''}`),make('p',outcome.perTrigger,'practical-effect'));
        if(outcome.perDay)section.append(make('p',outcome.perDay,'practical-daily'));
        if(outcome.caveat)section.append(make('p',outcome.caveat,'practical-note'));
        section.append(make('p',`Gathered ingredients have ${fmt(outcome.ingredientBaseValue)} base ingredient value per day before recipe bonuses. This becomes Snorlax strength only when cooked.`,'practical-note'));
        const percent = n => (n * 100).toLocaleString('en-US',{maximumFractionDigits:2});
        section.append(make('p',`This build’s ingredient chance is ${percent(result.stats.ingredientRate)}% per help (species base ${percent(build.species.ingredientRate)}%). Skill chance is ${percent(result.stats.skillRate)}% per eligible help (base ${percent(build.species.skillRate)}%). Locked subskills do not contribute.`,'practical-note'));
        if(outcome.dreamShards!==null)section.append(make('p','Dream Shards here come from main skills. Sleep-research rewards and Dream Shard Bonus subskills are separate.','practical-note'));
        return section;
    }
    root.SleepPracticalOutput={panel};
})(globalThis);
