"use strict";

/**
 * ============================================================
 * startseite.js
 * ============================================================
 * - Theme umschalten (Hell/Dunkel)
 * - Saison/Monat-Select aus daten/saison.json füllen
 * - Eigenschaften-Dropdown (Checkboxen) aus daten/eigenschaften.json füllen
 * - Lore-Dropdown (Checkboxen) aus daten/lore.json füllen
 *
 * WICHTIG (HTML IDs):
 * - Saison Select:      #seasonSelect
 * - Theme Toggle:       #themeToggle
 *
 * - Eigenschaften:
 *    Wrapper:           #propsDropdown   (div.dropdown)
 *    Button:            #propsToggle
 *    Menü:              #propsMenu
 *
 * - Lore:
 *    Wrapper:           #loreDropdown    (div.dropdown)
 *    Button:            #loreToggle
 *    Menü:              #loreMenu
 */

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initSaisonSelect();

  // Eigenschaften Dropdown
  initCheckboxDropdown({
    toggleId: "propsToggle",
    menuId: "propsMenu",
    title: "Eigenschaften",
    clearText: "Alle",
    jsonUrl: "./daten/eigenschaften.json",
    arrayKey: "eigenschaften",
    // Standard-Checks (bei dir: Allergene "enthält" automatisch an)
    defaultChecked: (entry) => String(entry.id).startsWith("prop_enthaelt_"),
    onChangeLogPrefix: "Eigenschaften",
  });

  // Lore Dropdown
  initCheckboxDropdown({
    dropdownId: "loreDropdown",
    toggleId: "loreToggle",
    menuId: "loreMenu",
    title: "Lore-Filter",
    clearText: "Alle",
    jsonUrl: "./daten/lore.json",
    arrayKey: "lore", // <-- DEIN JSON: { "lore": [ ... ] }
    defaultChecked: () => false,
    onChangeLogPrefix: "Lore-Filter",

    // ✅ Text im Dropdown anpassen (nur Lore)
    formatLabel: (entry) => {
      // Standard: nur Label
      let label = String(entry.label || "");

      // Wenn Gruppe "Preis": Münzen hinten dran
      if (String(entry.gruppe) === "Preis") {
        const coins = formatCoins(entry.preis);
        if (coins) label += ` (${coins})`;
      }

      return label;
    },
  });
});

// ============================================================
// THEME TOGGLE
// ============================================================
function initThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) {
    console.warn('Theme Toggle: Button mit id="themeToggle" nicht gefunden.');
    return;
  }

  toggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    toggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  });
}

// ============================================================
// SAISON SELECT
// ============================================================
function initSaisonSelect() {
  const select = document.getElementById("seasonSelect");
  if (!select) {
    console.warn('Saison Select: <select id="seasonSelect"> nicht gefunden.');
    return;
  }

  // Standard: "Alle"
  select.value = "";

  loadSaisonDataAndFillSelect(select).catch((err) => {
    console.error("Fehler beim Laden von ./daten/saison.json:", err);
  });

  select.addEventListener("change", (e) => {
    console.log("Saison/Monat gewählt:", e.target.value || "Alle");
  });
}

async function loadSaisonDataAndFillSelect(selectEl) {
  const res = await fetch("./daten/saison.json");
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  const data = await res.json();
  const list = Array.isArray(data.saison_labels) ? data.saison_labels : [];

  // Alte Optionen entfernen (aber "Alle" behalten)
  while (selectEl.options.length > 1) selectEl.remove(1);

  const optgroupSeasons = document.createElement("optgroup");
  optgroupSeasons.label = "Jahreszeiten";

  const optgroupMonths = document.createElement("optgroup");
  optgroupMonths.label = "Monate";

  list.forEach((entry) => {
    if (!entry || !entry.id || !entry.label) return;

    const option = document.createElement("option");
    option.value = String(entry.id);
    option.textContent = String(entry.label);

    if (option.value.startsWith("saison_")) optgroupSeasons.appendChild(option);
    else optgroupMonths.appendChild(option);
  });

  selectEl.appendChild(optgroupSeasons);
  selectEl.appendChild(optgroupMonths);

  // Keine Auto-Auswahl
  selectEl.value = "";
}

// ============================================================
// GENERISCHES DROPDOWN (Checkboxen) – für Eigenschaften UND Lore
// ============================================================

/**
 * Baut ein Dropdown mit Checkboxen (Bootstrap-ähnlich, aber ohne Bootstrap).
 * Gruppiert nach entry.gruppe.
 */
async function initCheckboxDropdown(cfg) {
  const toggleBtn = document.getElementById(cfg.toggleId);
  const menu = document.getElementById(cfg.menuId);

  // Wrapper finden:
  // - wenn cfg.dropdownId existiert -> per ID
  // - sonst: über den Button das nächste .dropdown suchen (passt zu deinem HTML)
  const dd = cfg.dropdownId
    ? document.getElementById(cfg.dropdownId)
    : toggleBtn?.closest(".dropdown");

  if (!dd || !toggleBtn || !menu) {
    console.warn(
      `Dropdown fehlt: ${cfg.dropdownId || "(auto .dropdown)"}/${cfg.toggleId}/${cfg.menuId} (bitte HTML IDs prüfen).`,
    );
    return;
  }

  // Menü leeren (falls Hot-Reload / mehrfach init)
  menu.innerHTML = "";

  // Badge (Zähler) am Button
  // Falls schon ein Badge existiert (z.B. durch Reload), zuerst entfernen
  toggleBtn.querySelectorAll(".dropdown-badge").forEach((b) => b.remove());

  const badge = document.createElement("span");
  badge.className = "dropdown-badge";
  badge.hidden = true;
  badge.textContent = "";
  toggleBtn.appendChild(badge);

  // Header (Titel + "Alle")
  const head = document.createElement("li");
  head.innerHTML = `
    <div class="dropdown-menu__head">
      <div class="dropdown-menu__title">${escapeHtml(cfg.title)}</div>
      <button class="dropdown-menu__clear" type="button">${escapeHtml(cfg.clearText)}</button>
    </div>
  `;
  menu.appendChild(head);

  const clearBtn = head.querySelector("button");

  // Öffnen/Schliessen
  toggleBtn.addEventListener("click", () => {
    const isOpen = dd.classList.toggle("open");
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
  });

  // Klick ausserhalb schliesst
  document.addEventListener("click", (e) => {
    if (!dd.contains(e.target)) {
      dd.classList.remove("open");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });

  // ESC schliesst
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dd.classList.remove("open");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });

  // JSON laden
  const res = await fetch(cfg.jsonUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  const data = await res.json();
  const list = Array.isArray(data?.[cfg.arrayKey]) ? data[cfg.arrayKey] : [];

  // Nach Gruppen sortieren
  const byGroup = new Map();
  for (const item of list) {
    if (!item || !item.id || !item.label || !item.gruppe) continue;
    const group = String(item.gruppe);
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(item);
  }

  // Gruppen rendern
  for (const [groupName, items] of byGroup.entries()) {
    const groupLi = document.createElement("li");
    groupLi.className = "dropdown-group";

    const title = document.createElement("p");
    title.className = "dropdown-group__title";
    title.textContent = groupName;
    groupLi.appendChild(title);

    for (const entry of items) {
      const label = document.createElement("label");
      label.className = "dropdown-item";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = String(entry.id);

      // Standard: ggf. automatisch anhaken (z.B. Allergene enthält)
      try {
        cb.checked = Boolean(cfg.defaultChecked?.(entry));
      } catch {
        cb.checked = false;
      }

      const icon = document.createElement("span");
      icon.className = "dropdown-item__icon";
      icon.textContent = entry.icon || "";

      const text = document.createElement("span");
      text.textContent = cfg.formatLabel ? cfg.formatLabel(entry) : entry.label;

      label.appendChild(cb);
      label.appendChild(icon);
      label.appendChild(text);

      groupLi.appendChild(label);

      cb.addEventListener("change", updateBadgeAndLog);
    }

    menu.appendChild(groupLi);
  }

  // "Alle" klick -> alles abwählen
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      menu.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.checked = false;
      });
      updateBadgeAndLog();
    });
  }

  // Startzustand
  updateBadgeAndLog();

  // --------- Hilfsfunktionen ---------

  function getCheckedIds() {
    return [...menu.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value);
  }

  function updateBadgeAndLog() {
    const checked = getCheckedIds();

    // 0 ausgewählt => "Alle"
    if (checked.length === 0) {
      badge.hidden = true;
      badge.textContent = "";
      console.log(`${cfg.onChangeLogPrefix}:`, "Alle");
      return;
    }

    // >0 => Badge zeigen
    badge.hidden = false;
    badge.textContent = String(checked.length);
    console.log(`${cfg.onChangeLogPrefix} gewählt:`, checked);
  }
}

// Mini-Helfer: schützt Titel/Buttons vor komischen Zeichen
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Hilfsfunktion: macht aus {km:1, sm:2, gm:3} -> "3 GM, 2 SM, 1 KM"
function formatCoins(preisObj) {
  if (!preisObj || typeof preisObj !== "object") return "";

  // Reihenfolge: Gold, Silber, Kupfer
  const parts = [];

  const gm = Number(preisObj.gm || 0);
  const sm = Number(preisObj.sm || 0);
  const km = Number(preisObj.km || 0);

  if (gm > 0) parts.push(`${gm} GM`);
  if (sm > 0) parts.push(`${sm} SM`);
  if (km > 0) parts.push(`${km} KM`);

  return parts.join(", ");
}