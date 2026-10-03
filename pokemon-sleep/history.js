"use strict";
let snapshots = [];
let snapshotRequest = 0;
let downloadURL = null;
const savedSnapshots = new Map();

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
    if (downloadURL) URL.revokeObjectURL(downloadURL);
    downloadURL = URL.createObjectURL(new Blob([JSON.stringify(data.roster, null, 2)], { type: "application/json" }));
    $("#roster-download").href = downloadURL;
    $("#roster-download").download = `pokemon-sleep-${data.roster.captured_at}.json`;
}
async function selectSnapshot(index) {
    const request = ++snapshotRequest;
    const entry = snapshots[index];
    $("#history-status").hidden = true;
    $("#history-select").setAttribute("aria-busy", "true");
    try {
        const current = await readSnapshot(entry);
        if (request !== snapshotRequest) return;
        showSnapshot(current);
        $("#history-select").dataset.loaded = String(index);
        return true;
    } catch {
        if (request !== snapshotRequest) return;
        $("#history-status").textContent = "Could not load that snapshot. The previous view is unchanged; select a snapshot to retry.";
        const loaded = $("#history-select").dataset.loaded;
        if (loaded != null) $("#history-select").value = loaded;
        $("#history-status").hidden = false;
        return false;
    } finally {
        if (request === snapshotRequest) $("#history-select").removeAttribute("aria-busy");
    }
}
$("#history-select").addEventListener("change", event => selectSnapshot(Number(event.target.value)));
async function initializeHistory() {
    try {
        const manifest = await readJSON("history.json");
        snapshots = manifest.snapshots;
        if (!snapshots.length) throw new Error("No saved snapshots");
        const select = $("#history-select");
        select.replaceChildren();
        for (let index = snapshots.length - 1; index >= 0; index--) {
            const entry = snapshots[index];
            const sameDay = snapshots.filter(item => item.captured_at === entry.captured_at);
            const suffix = sameDay.length > 1 ? ` · Capture ${sameDay.indexOf(entry) + 1}` : "";
            const option = node("option", "", `${dateLabel(entry.captured_at)}${suffix}${index === snapshots.length - 1 ? " · Latest" : ""}`);
            option.value = String(index);
            select.append(option);
        }
        select.disabled = false;
        if (!await selectSnapshot(snapshots.length - 1)) throw new Error("Latest archive unavailable");
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
