"use strict";
const $ = (selector) => document.querySelector(selector);
const number = (value) =>
    value == null ? "Unknown" : Number(value).toLocaleString("en-US");
let roster = [],
    specialty = "";
let snapshotDate = null;
let inventory = null;
let activeSnapshotId = null;
// Pick decorative summary icons once per page load, independent of snapshot changes.
const randomAssetName = (names) => names[Math.floor(Math.random() * names.length)];
const summaryIngredient = randomAssetName(Object.keys(sleepAssets.ingredients));
const summaryCandy = randomAssetName(
    Object.keys(sleepAssets.items).filter((name) => sleepAssets.items[name].startsWith("items/candy-")),
);
function dateLabel(value) {
    if (!value) return "Unknown";
    return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
    });
}
const natureAbbreviations = {
    "Speed of help": "SoH",
    "Ingredient finding": "ING",
    "Main skill chance": "MSC",
    "Energy recovery": "ER",
    "EXP gains": "EXP",
};
function natureBadges(mon, compact = false) {
    const badges = node("div", "nature-badges");
    for (const [effect, direction] of Object.entries(mon.nature_effects || {})) {
        const label = compact ? natureAbbreviations[effect] || effect : effect;
        const badge = node("span", `nature-badge ${direction}`, `${direction === "up" ? "↑" : "↓"} ${label}`);
        badge.title = `${effect} ${direction === "up" ? "increased" : "decreased"}`;
        badge.setAttribute("aria-label", badge.title);
        badges.append(badge);
    }
    if (!badges.childElementCount)
        badges.append(node("span", "nature-badge neutral", mon.nature_neutralized ? "Mint · Neutral" : mon.nature ? "No stat changes" : "Nature effects unavailable"));
    return badges;
}
const dialog = $("#detail");
function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
}
function assetIcon(category, name) {
    const path = sleepAssets[category]?.[name];
    if (!path) return null;
    const img = node("img", "asset-icon");
    img.src = `/pokemon-sleep/assets/${path}`;
    img.alt = ""; // The adjacent label (or parent title) names the item.
    img.width = 28;
    img.height = 28;
    img.loading = "lazy";
    img.addEventListener("error", () => { img.hidden = true; }, { once: true });
    return img;
}
function appendIcon(parent, category, name) {
    const icon = assetIcon(category, name);
    if (icon) parent.append(icon);
}
function favoriteStar() {
    const star = node("span", "favorite-star", "★");
    star.title = "Favorited in Pokémon Sleep";
    star.setAttribute("role", "img");
    star.setAttribute("aria-label", "Favorited");
    return star;
}
function specialtyBadge(mon) {
    const badge = node("span", "tag specialty-badge");
    badge.dataset.specialty = mon.specialty || "";
    appendIcon(badge, "specialties", mon.specialty);
    badge.append(document.createTextNode(mon.specialty ? `${mon.specialty} specialist` : "Specialty unavailable"));
    return badge;
}
function artwork(mon) {
    // The regional Wooper artwork is available separately; costumes use base art.
    const dex =
        mon.variant === "Paldean" && mon.national_dex === 194
            ? 10253
            : mon.national_dex;
    const img = node("img");
    img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${mon.shiny ? "shiny/" : ""}${dex}.png`;
    img.alt = `${mon.shiny ? "Shiny " : ""}${mon.variant === "Paldean" ? "Paldean " : ""}${mon.species}`;
    img.loading = "lazy";
    img.addEventListener(
        "error",
        () => {
            img.hidden = true;
        },
        { once: true },
    );
    return img;
}
function speciesLabel(mon) {
    return `${mon.variant ? mon.variant + " " : ""}${mon.species}`;
}
function matchesSearch(mon, query) {
    const aliases = [
        ...mon.subskills.map((slot) => subskillAbbreviations[slot.name]),
        ...Object.entries(mon.nature_effects || {}).flatMap(([effect, direction]) => {
            const label = natureAbbreviations[effect];
            return label ? [label, `${direction === "up" ? "↑" : "↓"} ${label}`] : [];
        }),
    ].filter(Boolean).map((label) => label.toLowerCase());
    // Match badge abbreviations exactly: ING should not match "Helping".
    if (aliases.includes(query.replace(/\s+/g, " "))) return true;
    const knownAlias = Object.values(subskillAbbreviations).concat(Object.values(natureAbbreviations))
        .some((label) => label.toLowerCase() === query);
    if (knownAlias) return false;
    return [mon.nickname, speciesLabel(mon), mon.nature, mon.berry, mon.main_skill.name,
        ...mon.ingredients.map((slot) => slot.name),
        ...mon.subskills.map((slot) => slot.name),
        ...Object.keys(mon.nature_effects || {}),
    ].filter(Boolean).join(" ").toLowerCase().includes(query);
}
function render() {
    const query = $("#search").value.trim().toLocaleLowerCase();
    const shown = roster.filter(
        (mon) =>
            (!specialty || mon.specialty === specialty || mon.specialty === "All") &&
            (!$("#shiny").checked || mon.shiny) &&
            (!$("#favorite").checked || mon.favorite === true) &&
            (!$("#legendary").checked || legendarySpecies.has(mon.national_dex)) &&
            matchesSearch(mon, query),
    );
    const sort = $("#sort").value;
    shown.sort((a, b) =>
        sort === "rp" || sort === "level"
            ? (b[sort] ?? -1) - (a[sort] ?? -1) ||
              a.species.localeCompare(b.species)
            : (sort === "nickname"
                  ? a.nickname || a.species
                  : a.species
              ).localeCompare(
                  sort === "nickname" ? b.nickname || b.species : b.species,
              ),
    );
    const fragment = document.createDocumentFragment();
    for (const mon of shown) {
        const card = node("button", "card");
        card.type = "button";
        card.dataset.specialty = mon.specialty || "";
        card.setAttribute(
            "aria-label",
            `View ${mon.nickname || speciesLabel(mon)}, level ${mon.level}${mon.favorite === true ? ", favorited" : ""}`,
        );
        const art = node("div", "card-art");
        art.append(
            node("span", "level-pill", `Lv. ${mon.level}`),
            artwork(mon),
        );
        if (mon.shiny) art.append(node("span", "shine-pill", "✦ Shiny"));
        if (mon.favorite === true) art.append(favoriteStar());
        const info = node("div", "card-info"),
            heading = node("div", "card-heading");
        const names = node("div");
        names.append(
            node("h3", "", mon.nickname || mon.species),
            node("p", "species-name", speciesLabel(mon)),
        );
        const rp = node("div", "rp", number(mon.rp));
        rp.append(node("small", "", "RP"));
        heading.append(names, rp);
        const skill = node("div", "card-skill");
        skill.title = mon.main_skill.name || "Skill unavailable";
        skill.append(
            node("span", "", mon.main_skill.name || "Skill unavailable"),
            node(
                "strong",
                "",
                mon.main_skill.level == null
                    ? "—"
                    : `Lv. ${mon.main_skill.level}`,
            ),
        );
        const bottom = node("div", "card-nature");
        bottom.append(node("span", "card-nature-name", mon.nature || "Nature unavailable"), natureBadges(mon, true));
        const resources = node("div", "card-resources");
        const berry = node("span", "resource-berry");
        berry.title = mon.berry || "Berry unknown";
        berry.setAttribute("aria-label", berry.title);
        appendIcon(berry, "berries", mon.berry);
        resources.append(berry);
        for (const slot of mon.ingredients) {
            const item = node("span", `resource-item${slot.unlocked ? "" : " locked"}`);
            item.title = slot.empty ? `Eureka Seed needed · Lv. ${slot.unlock_level ?? "?"}` : `${slot.name || "Ingredient unknown"} ×${slot.quantity ?? "?"} · ${slot.unlocked ? "" : "Locked · "}Lv. ${slot.unlock_level ?? "?"}`;
            item.setAttribute("aria-label", item.title);
            appendIcon(item, "ingredients", slot.name);
            if (slot.name) item.append(node("small", "", `×${slot.quantity ?? "?"}`));
            else item.append(node("small", "", slot.empty ? "—" : "?"));
            resources.append(item);
        }
        const badges = node("div", "card-subskills");
        for (const slot of mon.subskills) {
            const rarity = sleepAssets.subskills[slot.name];
            const label = subskillAbbreviations[slot.name] || (slot.empty ? "—" : "?");
            const badge = node(
                "span",
                `subskill-badge${rarity ? ` rarity-${rarity}` : ""}${slot.unlocked ? "" : " locked"}`,
                label,
            );
            badge.title = `${slot.empty ? "Eureka Seed needed" : slot.name || "Subskill unavailable"} · ${slot.unlocked ? "" : "Locked · "}Lv. ${slot.unlock_level ?? "?"}`;
            badge.setAttribute("aria-label", badge.title);
            badges.append(badge);
        }
        info.append(heading, skill, resources, badges, bottom);
        card.append(art, info);
        card.addEventListener("click", () => showDetail(mon));
        fragment.append(card);
    }
    $("#grid").replaceChildren(fragment);
    $("#result-count").textContent =
        `${shown.length} of ${roster.length} helpers`;
    $("#empty").hidden = shown.length !== 0;
}
function section(title) {
    const s = node("section", "detail-section");
    s.append(node("h3", "", title));
    return s;
}
let selectedMon = null;
function renderCandyBalance() {
    const box = dialog.querySelector(".candy-badge");
    if (!box || !selectedMon) return;
    const candy = inventory?.captured_at === snapshotDate ? inventory.pokemon_candies[selectedMon.id] : null;
    box.replaceChildren();
    if (candy) appendIcon(box, "items", candy.name);
    box.append(document.createTextNode(candy ? `${candy.name} × ${number(candy.quantity)}` : "Candy unavailable"));
    box.title = candy ? "Shared by this Pokémon’s evolution family." : "Candy count unavailable for this date.";
    box.setAttribute("aria-label", `${box.textContent}. ${box.title}`);
}
function showDetail(mon) {
    selectedMon = mon;
    const header = node("div", "detail-header"),
        title = node("div");
    title.append(
        node(
            "p",
            "eyebrow",
            `${mon.shiny ? "✦ SHINY · " : ""}POKÉDEX #${String(mon.national_dex).padStart(3, "0")}`,
        ),
        node("h2", "", mon.nickname || mon.species),
        node(
            "p",
            "",
            `${speciesLabel(mon)} · Level ${mon.level} · ${number(mon.rp)} RP`,
        ),
    );
    if (mon.favorite === true) title.querySelector("h2").append(favoriteStar());
    if (activeSnapshotId) {
        const link = node("button", "detail-share", "Copy link");
        link.type = "button";
        link.addEventListener("click", async () => {
            const url = new URL("https://davidzlchen.com/pokemon-sleep/");
            url.searchParams.set("snapshot", activeSnapshotId);
            url.searchParams.set("pokemon", mon.id);
            url.hash = "collection";
            try {
                await navigator.clipboard.writeText(url.href);
                link.textContent = "Link copied";
            } catch {
                window.history.replaceState(null, "", `${url.search}${url.hash}`);
                link.textContent = "Copy the address bar link";
            }
        });
        title.append(link);
    }
    header.append(artwork(mon), title);
    const body = node("div", "detail-body"),
        meta = node("div", "detail-meta");
    const berryBadge = node("span", "tag berry-badge");
    appendIcon(berryBadge, "berries", mon.berry);
    berryBadge.append(document.createTextNode(mon.berry || "Berry unknown"));
    meta.append(specialtyBadge(mon), berryBadge, node("span", "tag candy-badge"));
    if (mon.shiny) meta.append(node("span", "tag shiny-badge", "✦ Shiny"));
    body.append(meta);

    const xp = section("Experience");
    const xpLabel = node("div", "xp-label");
    xpLabel.append(
        node("span", "", `Level ${mon.level} → ${mon.level + 1}`),
        node(
            "span",
            "",
            `${number(mon.xp_in_level)} / ${number(mon.xp_level_required)} XP`,
        ),
    );
    xp.append(xpLabel);
    if (mon.xp_in_level != null && mon.xp_level_required > 0) {
        const bar = node("progress");
        bar.max = mon.xp_level_required;
        bar.value = mon.xp_in_level;
        bar.setAttribute("aria-label", "Experience toward next level");
        xp.append(bar);
    }
    xp.append(
        node(
            "p",
            "xp-caption",
            `${number(mon.xp_to_next_level)} XP to next level · ${number(mon.xp_total)} lifetime XP`,
        ),
    );
    body.append(xp);
    const main = section("Main skill"),
        box = node("div", "skill-box");
    box.append(
        node("strong", "", mon.main_skill.name || "Unavailable"),
        node(
            "span",
            "",
            mon.main_skill.level == null ? "—" : `Lv. ${mon.main_skill.level}`,
        ),
    );
    main.append(box);
    body.append(main);
    const columns = node("div", "detail-columns");
    for (const [key, label] of [
        ["ingredients", "Ingredients"],
        ["subskills", "Subskills"],
    ]) {
        const s = section(label);
        for (const slot of mon[key]) {
            const row = node("div", `slot${slot.unlocked ? "" : " locked"}`),
                name = node("span", "", slot.empty ? "Eureka Seed needed" : slot.name || "Unavailable");
            name.className = "slot-name";
            if (key === "ingredients") {
                const icon = assetIcon("ingredients", slot.name);
                if (icon) name.prepend(icon);
            }
            const rarity = key === "subskills" ? sleepAssets.subskills[slot.name] : null;
            if (rarity) {
                row.classList.add(`rarity-${rarity}`);
                const text = node("span", "slot-label", slot.name || "Unavailable");
                name.replaceChildren(text);
            }
            if (key === "ingredients" && slot.quantity != null)
                name.append(node("em", "", `×${slot.quantity}`));
            row.append(
                name,
                node(
                    "small",
                    "",
                    `${slot.unlocked ? "" : "🔒 Locked · "}Lv. ${slot.unlock_level ?? "?"}`,
                ),
            );
            s.append(row);
        }
        if (!mon[key].length)
            s.append(node("p", "xp-caption", "Unavailable"));
        columns.append(s);
    }
    body.append(columns);
    const nature = section("Nature");
    nature.append(
        node("div", "nature-name", mon.nature || "Nature unavailable"),
    );
    if (!mon.nature)
        nature.append(
            node(
                "p",
                "xp-caption",
                `Original nature: ${mon.original_nature || "Unknown"}`,
            ),
        );
    nature.append(natureBadges(mon));
    if (mon.nature_neutralized) nature.append(node("p", "xp-caption", "Neutralizing Mint applied · Nature bonuses and penalties removed."));
    body.append(nature);
    const capture = section("Capture details");
    for (const [label, value] of [
        ["Area met", mon.met_area || "Unknown"],
        ["Date met", dateLabel(mon.met_date)],
        ["Collection updated", dateLabel(snapshotDate)],
    ]) {
        const row = node("div", "capture-row");
        row.append(node("span", "", label), node("strong", "", value));
        capture.append(row);
    }
    body.append(capture);
    $("#detail-content").replaceChildren(header, body);
    dialog.setAttribute("aria-label", `${mon.nickname || mon.species} details`);
    renderCandyBalance();
    dialog.showModal();
    dialog.scrollTop = 0;
}
$("#close-detail").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
        )
            dialog.close();
    }
});
for (const selector of ["#search", "#sort", "#shiny", "#legendary", "#favorite"])
    $(selector).addEventListener(
        selector === "#search" ? "input" : "change",
        render,
    );
document.querySelectorAll(".filter").forEach((button) =>
    button.addEventListener("click", () => {
        specialty = button.dataset.specialty;
        document.querySelectorAll(".filter").forEach((b) => {
            b.classList.toggle("active", b === button);
            b.setAttribute("aria-pressed", String(b === button));
        });
        render();
    }),
);
function renderInventory() {
    if (!inventory) return;
    const search = $("#inventory-search").value.trim().toLowerCase();
    const includeEmpty = $("#inventory-zero").checked;
    const entries = inventory.entries.filter((entry) =>
        entry.category !== "Unmapped items" && (includeEmpty || entry.quantity == null || entry.quantity > 0) &&
        `${entry.name || entry.unresolved_label || ""} ${entry.category}`.toLowerCase().includes(search));
    const groups = $("#inventory-groups");
    const expanded = new Set([...groups.querySelectorAll("details[open]")].map((group) => group.dataset.category));
    groups.replaceChildren();
    for (const category of ["Items", "Ingredients", "Pokémon candies"]) {
        const matching = entries.filter((entry) => entry.category === category);
        if (!matching.length) continue;
        const group = node("details", "inventory-group");
        group.dataset.category = category;
        group.open = !!search || expanded.has(category);
        group.append(node("summary", "", `${category} · ${matching.length} ${matching.length === 1 ? "stack" : "stacks"}`));
        const list = node("div", "inventory-list");
        for (const entry of matching) {
            const item = node("div", "inventory-item");
            if (category === "Ingredients") appendIcon(item, "ingredients", entry.name);
            else appendIcon(item, "items", entry.name);
            const text = node("div", "inventory-item-text");
            text.append(node("strong", "", entry.name || "Unknown item"));
            if (entry.description) text.append(node("p", "", entry.description));
            if (entry.needs_review) text.append(node("p", "", "Some details unavailable"));
            item.append(text, node("span", "inventory-quantity", number(entry.quantity)));
            list.append(item);
        }
        group.append(list);
        groups.append(group);
    }
    $("#inventory-count").hidden = entries.length > 0;
    $("#inventory-count").textContent = entries.length ? "" : "No supplies found. Try another search or include empty stacks.";
}
$("#inventory-search").addEventListener("input", renderInventory);
$("#inventory-zero").addEventListener("change", renderInventory);
function applyInventory(data) {
    inventory = data;
    $("#researcher-rank").textContent = number(data.researcher_rank);
    $("#inventory-overview").replaceChildren();
    $("#inventory-date").textContent = `As of ${dateLabel(data.captured_at)}.`;
    for (const [label, value, iconCategory, iconName] of [
        ["Dream Shards", data.dream_shards, "items", "Dream Shards"],
        ["Ingredients in the bag", data.entries.filter((entry) => entry.category === "Ingredients").reduce((sum, entry) => sum + (entry.quantity || 0), 0), "ingredients", summaryIngredient],
        ["Pokémon candy stacks", data.entries.filter((entry) => entry.category === "Pokémon candies" && entry.quantity > 0).length, "items", summaryCandy],
    ]) {
        const stat = node("div", "inventory-stat");
        const caption = node("span", "inventory-stat-label");
        appendIcon(caption, iconCategory, iconName);
        caption.append(document.createTextNode(label));
        stat.append(node("strong", "", number(value)), caption);
        $("#inventory-overview").append(stat);
    }
    renderInventory();
}
document.querySelectorAll(".filter[data-specialty]").forEach((button) => {
    const icon = assetIcon("specialties", button.dataset.specialty);
    if (icon) button.prepend(icon);
});
function applyRoster(data) {
    roster = data.records;
    snapshotDate = data.captured_at;
    for (const [nickname, selector] of [
        ["charge king", ".label-one span"],
        ["sausage king", ".label-two span"],
    ]) {
        const featured = roster.find((mon) => mon.nickname === nickname);
        $(selector).textContent = featured ? `Lv. ${featured.level}` : "";
    }
    $("#total").textContent = roster.length;
    $("#species").textContent = new Set(
        roster.map(
            (mon) =>
                `${mon.national_dex}:${mon.variant === "Paldean" ? mon.variant : ""}`,
        ),
    ).size;
    $("#shinies").textContent = roster.filter((mon) => mon.shiny).length;
    $("#highest").textContent = Math.max(0, ...roster.map((mon) => mon.level));
    const date = new Date(
        `${data.captured_at}T12:00:00Z`,
    ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
    $("#snapshot").textContent = date;
    render();
}
