"use strict";
const $ = (selector) => document.querySelector(selector);
const number = (value) =>
    value == null ? "Unknown" : Number(value).toLocaleString("en-US");
let roster = [],
    specialty = "";
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
function specialtyBadge(mon) {
    const badge = node("span", "tag specialty-badge");
    badge.dataset.specialty = mon.specialty || "";
    appendIcon(badge, "specialties", mon.specialty);
    badge.append(document.createTextNode(mon.specialty ? `${mon.specialty} specialist` : "Specialty not yet mapped"));
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
function render() {
    const query = $("#search").value.trim().toLocaleLowerCase();
    const shown = roster.filter(
        (mon) =>
            (!specialty || mon.specialty === specialty) &&
            (!$("#shiny").checked || mon.shiny) &&
            (!$("#legendary").checked || legendarySpecies.has(mon.national_dex)) &&
            [
                mon.nickname,
                speciesLabel(mon),
                mon.nature,
                mon.berry,
                mon.main_skill.name,
                ...mon.ingredients.map((x) => x.name),
                ...mon.subskills.map((x) => x.name),
            ]
                .filter(Boolean)
                .join(" ")
                .toLocaleLowerCase()
                .includes(query),
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
            `View ${mon.nickname || speciesLabel(mon)}, level ${mon.level}`,
        );
        const art = node("div", "card-art");
        art.append(
            node("span", "level-pill", `Lv. ${mon.level}`),
            artwork(mon),
        );
        if (mon.shiny) art.append(node("span", "shine-pill", "✦ Shiny"));
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
        skill.append(
            node("span", "", mon.main_skill.name || "Skill not yet mapped"),
            node(
                "strong",
                "",
                mon.main_skill.level == null
                    ? "—"
                    : `Lv. ${mon.main_skill.level}`,
            ),
        );
        const bottom = node("div", "card-bottom"),
            type = node("span");
        appendIcon(type, "specialties", mon.specialty);
        type.append(document.createTextNode(mon.specialty || "Specialty unresolved"));
        bottom.append(
            type,
            node("span", "", mon.nature || "Mint effect pending"),
        );
        const resources = node("div", "card-resources");
        const berry = node("span", "resource-berry");
        berry.title = mon.berry || "Berry unknown";
        berry.setAttribute("aria-label", berry.title);
        appendIcon(berry, "berries", mon.berry);
        resources.append(berry);
        for (const slot of mon.ingredients) {
            const item = node("span", `resource-item${slot.unlocked ? "" : " locked"}`);
            item.title = `${slot.name || "Ingredient unknown"} ×${slot.quantity ?? "?"} · ${slot.unlocked ? "" : "Locked · "}Lv. ${slot.unlock_level ?? "?"}`;
            item.setAttribute("aria-label", item.title);
            appendIcon(item, "ingredients", slot.name);
            if (slot.name) item.append(node("small", "", `×${slot.quantity ?? "?"}`));
            else item.append(node("small", "", "?"));
            resources.append(item);
        }
        const badges = node("div", "card-subskills");
        for (const slot of mon.subskills) {
            const rarity = sleepAssets.subskills[slot.name];
            const abbreviation = subskillAbbreviations[slot.name] || "?";
            const badge = node(
                "span",
                `subskill-badge${rarity ? ` rarity-${rarity}` : ""}${slot.unlocked ? "" : " locked"}`,
                abbreviation,
            );
            badge.title = `${slot.name || "Subskill not yet mapped"} · ${slot.unlocked ? "" : "Locked · "}Lv. ${slot.unlock_level ?? "?"}`;
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
function showDetail(mon) {
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
    header.append(artwork(mon), title);
    const body = node("div", "detail-body"),
        meta = node("div", "detail-meta");
    const berryBadge = node("span", "tag berry-badge");
    appendIcon(berryBadge, "berries", mon.berry);
    berryBadge.append(document.createTextNode(mon.berry || "Berry unknown"));
    meta.append(specialtyBadge(mon), berryBadge);
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
        node("strong", "", mon.main_skill.name || "Not yet mapped"),
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
        if (key === "subskills") {
            const legend = node("p", "rarity-legend", "Gold · Silver · Normal");
            s.append(legend);
        }
        for (const slot of mon[key]) {
            const row = node("div", `slot${slot.unlocked ? "" : " locked"}`),
                name = node("span", "", slot.name || "Not yet mapped");
            name.className = "slot-name";
            if (key === "ingredients") {
                const icon = assetIcon("ingredients", slot.name);
                if (icon) name.prepend(icon);
            }
            const rarity = key === "subskills" ? sleepAssets.subskills[slot.name] : null;
            if (rarity) {
                row.classList.add(`rarity-${rarity}`);
                const text = node("span", "slot-label", slot.name || "Not yet mapped");
                name.replaceChildren(text, node("span", "rarity-caption", rarity));
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
            s.append(node("p", "xp-caption", "Not yet mapped"));
        columns.append(s);
    }
    body.append(columns);
    const nature = section("Nature");
    nature.append(
        node("div", "nature-name", mon.nature || "Mint effect not yet mapped"),
    );
    if (!mon.nature)
        nature.append(
            node(
                "p",
                "xp-caption",
                `Original nature: ${mon.original_nature || "Unknown"}`,
            ),
        );
    for (const [effect, direction] of Object.entries(
        mon.nature_effects || {},
    )) {
        const line = node("p", "effect");
        line.append(
            node("span", direction, direction === "up" ? "↑" : "↓"),
            document.createTextNode(
                `${effect} ${direction === "up" ? "increased" : "decreased"}`,
            ),
        );
        nature.append(line);
    }
    body.append(nature);
    const review = node("details", "review");
    review.append(node("summary", "", "About these stats"));
    review.append(
        node(
            "p",
            "",
            "Level, RP, experience, ingredient slots, subskills, original nature, berry, and shiny status are mapped from the captured roster. Main-skill levels include active Skill Level Up bonuses.",
        ),
    );
    review.append(
        node(
            "p",
            "",
            `Main skill: ${mon.main_skill.name_source || "unresolved"}. Specialty: species reference, where available. Artwork may differ from in-game costumes.`,
        ),
    );
    if (mon.review_reasons.length) {
        const list = node("ul");
        for (const reason of mon.review_reasons)
            list.append(node("li", "", reason));
        review.append(list);
    }
    body.append(review);
    $("#detail-content").replaceChildren(header, body);
    dialog.setAttribute("aria-label", `${mon.nickname || mon.species} details`);
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
for (const selector of ["#search", "#sort", "#shiny", "#legendary"])
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
document.querySelectorAll(".filter[data-specialty]").forEach((button) => {
    const icon = assetIcon("specialties", button.dataset.specialty);
    if (icon) button.prepend(icon);
});
fetch("/pokemon-sleep/roster.json", { cache: "no-cache" })
    .then((response) => {
        if (!response.ok) throw new Error("Roster unavailable");
        return response.json();
    })
    .then((data) => {
        roster = data.records;
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
        $("#highest").textContent = Math.max(...roster.map((mon) => mon.level));
        const date = new Date(
            `${data.captured_at}T12:00:00Z`,
        ).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
        });
        $("#snapshot").textContent = `Roster snapshot · ${date}`;
        render();
    })
    .catch(() => {
        $("#result-count").textContent = "Could not load the roster.";
        $("#grid").append(
            node(
                "p",
                "loading-error",
                "The roster is temporarily unavailable. Please reload to try again.",
            ),
        );
        $("#snapshot").textContent = "Snapshot unavailable";
    });
