/* Regular-field berry sets from Neroli's Lab (see analyzer/NOTICE.txt).
   Expert weekly effects are deliberately unavailable, rather than approximated. */
(function(root) {
    'use strict';
    const islands = [
        {id:'custom',name:'Custom / no island',berries:null},
        {id:'greengrass',name:'Greengrass Isle',berries:null},
        {id:'cyan',name:'Cyan Beach',berries:['Oran','Pamtre','Pecha']},
        {id:'taupe',name:'Taupe Hollow',berries:['Figy','Leppa','Sitrus']},
        {id:'snowdrop',name:'Snowdrop Tundra',berries:['Persim','Rawst','Wiki']},
        {id:'lapis',name:'Lapis Lakeside',berries:['Cheri','Durin','Mago']},
        {id:'powerplant',name:'Old Gold Power Plant',berries:['Belue','Bluk','Grepa']},
        {id:'amber',name:'Amber Canyon',berries:['Chesto','Lum','Yache']}
    ];
    function get(id) { return islands.find(i=>i.id===id) || islands[0]; }
    function savedBonus(id,inventory) {
        const value=inventory?.island_bests?.find(i=>i.name===get(id).name)?.area_bonus_percent;
        return typeof value==='number' && Number.isFinite(value) ? value : null;
    }
    function favorite(id,berry) {
        return get(id).berries?.includes(berry.replace(/ Berry$/, '')) ?? null;
    }
    function fill(select) {
        for(const island of islands) { const option=document.createElement('option');option.value=island.id;option.textContent=island.name;select.append(option); }
        for(const name of ['Greengrass Isle (Expert)','Cyan Beach (Expert)']) {
            const option=document.createElement('option');option.disabled=true;option.textContent=name+' — weekly effects not modeled';select.append(option);
        }
    }
    function note(id,inventory,area) {
        const island=get(id),bonus=savedBonus(id,inventory);
        const berries=island.berries ? 'Favorites: '+island.berries.join(', ')+'.' : id==='greengrass' ? 'Favorites vary weekly; check the box if this helper’s berry is a favorite.' : 'Set the area bonus and favorite berry manually.';
        const source=id==='custom' ? '' : bonus===null ? ' Area bonus not recorded; enter it manually (0% assumed).' : Number(area)===bonus ? ` Saved area bonus: ${bonus}% (${inventory.captured_at}).` : ` Area bonus overridden; saved: ${bonus}% (${inventory.captured_at}).`;
        return berries+source+' Regular islands change strength, not gathering counts or skill Dream Shards.';
    }
    const api={islands,get,savedBonus,favorite,fill,note};
    if(typeof module==='object' && module.exports) module.exports=api;
    root.SleepIslands=api;
})(globalThis);
