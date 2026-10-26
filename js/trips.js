/* Small, browser-only conveniences. Trip data and JPY defaults remain in HTML. */
(() => {
    "use strict";
    const currency = document.querySelector("#trip-currency");
    const packagesNode = document.querySelector("#trip-packages");
    const packageButtons = [...document.querySelectorAll("[data-package]")];
    const params = new URL(window.location.href).searchParams;
    const packages = packagesNode ? JSON.parse(packagesNode.textContent) : null;
    let selectedPackage = packages && Object.hasOwn(packages, params.get("package"))
        ? params.get("package") : "value";
    if (currency && params.get("currency") === "usd") currency.value = "usd";

    function money(jpy) {
        const usd = currency?.value === "usd";
        return new Intl.NumberFormat("en-US", {
            style: "currency", currency: usd ? "USD" : "JPY", maximumFractionDigits: 0,
        }).format(usd ? jpy / 158.13 : jpy);
    }
    function updateMoney() {
        document.querySelectorAll("[data-jpy]").forEach(el => {
            const amount = Number(el.dataset.jpy);
            if (Number.isFinite(amount)) el.textContent = money(amount);
        });
    }
    function appendText(parent, tag, text, className) {
        const el = document.createElement(tag);
        el.textContent = text;
        if (className) el.className = className;
        parent.append(el);
        return el;
    }
    function renderPackage() {
        if (!packages) return;
        const data = packages[selectedPackage];
        document.querySelector("#package-total").dataset.jpy = data.total;
        document.querySelector("#package-description").textContent = data.description;
        const model = document.querySelector("#package-model");
        model.replaceChildren();
        appendText(model, "b", data.modeledTitle);
        appendText(model, "p", data.modeledNote);
        const tbody = document.querySelector("#hotel-rows");
        tbody.replaceChildren();
        data.hotels.forEach(hotel => {
            const row = document.createElement("tr");
            appendText(row, "td", hotel.dates);
            const property = appendText(row, "td", "");
            const a = appendText(property, "a", hotel.name);
            a.href = hotel.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            appendText(property, "small", hotel.beds);
            const cost = appendText(row, "td", "");
            appendText(cost, "span", money(hotel.quote), "quote").dataset.jpy = hotel.quote;
            appendText(cost, "small", hotel.extra);
            const terms = appendText(row, "td", hotel.cancel);
            appendText(terms, "small", hotel.parking);
            tbody.append(row);
        });
        packageButtons.forEach(button => {
            button.setAttribute("aria-pressed", String(button.dataset.package === selectedPackage));
        });
        updateMoney();
    }
    function updateQuery() {
        const url = new URL(window.location.href);
        if (packages) {
            if (selectedPackage === "value") url.searchParams.delete("package");
            else url.searchParams.set("package", selectedPackage);
        }
        if (currency?.value === "usd") url.searchParams.set("currency", "usd");
        else url.searchParams.delete("currency");
        window.history.replaceState(null, "", url);
    }
    packageButtons.forEach(button => button.addEventListener("click", () => {
        const next = button.dataset.package;
        if (!packages || !Object.hasOwn(packages, next)) return;
        selectedPackage = next;
        renderPackage();
        updateQuery();
        document.querySelector("#package-announcement").textContent = `${button.textContent} selected. Quoted lodging ${money(packages[next].total)}.`;
    }));
    currency?.addEventListener("change", () => {
        updateMoney();
        updateQuery();
    });
    renderPackage();
    updateMoney();

    const storageKey = `trip-checklist.v1:${window.location.pathname}`;
    let checks = {};
    try {
        const value = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
        if (value && typeof value === "object" && !Array.isArray(value)) checks = value;
    } catch { /* A blocked storage setting must not prevent reading the trip. */ }
    document.querySelectorAll("[data-check]").forEach(input => {
        input.checked = checks[input.dataset.check] === true;
        input.addEventListener("change", () => {
            checks[input.dataset.check] = input.checked;
            try {
                window.localStorage.setItem(storageKey, JSON.stringify(checks));
                const status = document.querySelector("#checklist-status");
                if (status) status.textContent = "Saved on this device. Checking a box does not make a booking.";
            } catch {
                const status = document.querySelector("#checklist-status");
                if (status) status.textContent = "Browser storage is unavailable; this change lasts until you leave the page.";
            }
        });
    });

    document.querySelectorAll("[data-copy-trip]").forEach(button => {
        button.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                button.textContent = "Link copied ✓";
                window.setTimeout(() => { button.textContent = "Copy trip link ↗"; }, 2500);
            } catch {
                const status = document.querySelector("#copy-status");
                if (status) status.textContent = "Copy the current address from your browser to share this trip.";
            }
        });
    });
})();
