"use strict";
let snapshots = [];
let snapshotRequest = 0;
const savedSnapshots = new Map();
let loadedSnapshot = null;
const historyTrigger = $("#history-trigger");
const historyMenu = $("#snapshot-menu");
function closeHistory(restoreFocus = false) {
    historyMenu.hidden = true;
    historyTrigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) historyTrigger.focus();
}
historyTrigger.addEventListener("click", () => {
    const opening = historyMenu.hidden;
    historyMenu.hidden = !opening;
    historyTrigger.setAttribute("aria-expanded", String(opening));
});
document.addEventListener("click", event => {
    if (!event.target.closest(".snapshot-picker")) closeHistory();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !historyMenu.hidden) {
        event.preventDefault();
        closeHistory(true);
    }
});
$(".snapshot-picker").addEventListener("focusout", event => {
    if (!event.currentTarget.contains(event.relatedTarget)) closeHistory();
});
function markSnapshot(index) {
    const entry = snapshots[index];
    const sameDay = snapshots.filter(item => item.captured_at === entry.captured_at);
    const update = sameDay.length > 1 ? `, update ${sameDay.indexOf(entry) + 1}` : "";
    historyTrigger.setAttribute("aria-label", `Choose a saved Field Notes snapshot. Currently ${dateLabel(entry.captured_at)}${update}${index === snapshots.length - 1 ? ", latest" : ""}.`);
    $("#snapshot-latest").hidden = index !== snapshots.length - 1;
    for (const button of $("#snapshot-entries").children)
        button.setAttribute("aria-pressed", String(Number(button.dataset.index) === index));
}

async function readJSON(path) {
    const response = await fetch(`/pokemon-sleep/${path}`, { cache: "no-cache" });
    if (!response.ok) throw new Error("Snapshot unavailable");
    return response.json();
}
async function readSnapshot(entry) {
    if (!savedSnapshots.has(entry.id)) {
        const data = await readJSON(entry.file);
        if (data.roster.captured_at !== entry.captured_at || data.inventory.captured_at !== entry.captured_at)
            throw new Error("Snapshot dates do not match");
        savedSnapshots.set(entry.id, data);
    }
    return savedSnapshots.get(entry.id);
}
function showSnapshot(data) {
    if (dialog.open) dialog.close();
    selectedMon = null;
    applyRoster(data.roster);
    applyInventory(data.inventory);
}
async function selectSnapshot(index) {
    const request = ++snapshotRequest;
    const entry = snapshots[index];
    $("#history-status").hidden = true;
    historyTrigger.setAttribute("aria-busy", "true");
    try {
        const current = await readSnapshot(entry);
        if (request !== snapshotRequest) return;
        activeSnapshotId = entry.id;
        showSnapshot(current);
        loadedSnapshot = index;
        markSnapshot(index);
        return true;
    } catch {
        if (request !== snapshotRequest) return;
        $("#history-status").textContent = "Could not load that snapshot. The previous view is unchanged; select a snapshot to retry.";
        if (loadedSnapshot != null) markSnapshot(loadedSnapshot);
        $("#history-status").hidden = false;
        return false;
    } finally {
        if (request === snapshotRequest) historyTrigger.removeAttribute("aria-busy");
    }
}
async function initializeHistory() {
    try {
        const manifest = await readJSON("history.json");
        snapshots = manifest.snapshots;
        if (!snapshots.length) throw new Error("No saved snapshots");
        const entries = $("#snapshot-entries");
        entries.replaceChildren();
        $("#snapshot-count").textContent = `${snapshots.length} ${snapshots.length === 1 ? "entry" : "entries"}`;
        for (let index = snapshots.length - 1; index >= 0; index--) {
            const entry = snapshots[index];
            const sameDay = snapshots.filter(item => item.captured_at === entry.captured_at);
            const suffix = sameDay.length > 1 ? ` · Update ${sameDay.indexOf(entry) + 1}` : "";
            const button = node("button", "snapshot-entry");
            button.type = "button";
            button.dataset.index = String(index);
            button.setAttribute("aria-pressed", "false");
            button.append(node("span", "snapshot-entry-date", `${dateLabel(entry.captured_at)}${suffix}`));
            if (index === snapshots.length - 1) button.append(node("span", "snapshot-latest", "Latest"));
            const check = node("span", "snapshot-entry-check", "✓");
            check.setAttribute("aria-hidden", "true");
            button.append(check);
            button.addEventListener("click", async () => {
                closeHistory(true);
                await selectSnapshot(index);
            });
            entries.append(button);
        }
        historyTrigger.disabled = false;
        const params = new URLSearchParams(window.location.search);
        const requested = snapshots.findIndex(entry => entry.id === params.get("snapshot"));
        if (!await selectSnapshot(requested >= 0 ? requested : snapshots.length - 1)) throw new Error("Archive unavailable");
        if (params.has("snapshot") && requested < 0) {
            $("#history-status").textContent = "That saved collection is unavailable. Showing the latest instead.";
            $("#history-status").hidden = false;
        } else if (params.has("pokemon")) {
            const mon = roster.find(mon => mon.id === params.get("pokemon"));
            if (mon) showDetail(mon);
            else $("#result-count").textContent = "That Pokémon is unavailable in this saved collection.";
        }
    } catch {
        $("#history-status").textContent = "History unavailable. Showing the latest published snapshot.";
        $("#history-status").hidden = false;
        try {
            const [roster, inventory] = await Promise.all([readJSON("roster.json"), readJSON("inventory.json")]);
            if (roster.captured_at !== inventory.captured_at) throw new Error("Snapshot dates do not match");
            showSnapshot({ roster, inventory });
        } catch {
            $("#snapshot").textContent = "Snapshot unavailable";
            $("#result-count").textContent = "Could not load the roster. Reload to try again.";
            $("#inventory-date").textContent = "Supplies unavailable.";
        }
    }
}
initializeHistory();
