"use strict";

/**
 * ============================================================
 * startseite.js
 * ============================================================
 * - Theme Toggle
 * - Filter UI (Saison, Eigenschaften, Lore, Nährstoffe, Zutaten)
 * - Rezeptliste rendert UND filtert #rezepteListe
 *
 * JSONs bleiben wie sie sind.
 */

// ============================================================
// GLOBAL STATE (Filter)
// ============================================================
window.REZEPTE_FILTER = window.REZEPTE_FILTER || {
  // Eigenschaften:
  // - excluded: abgewählte Defaults (Allergen/Trigger)
  // - required: aktiv angehakte Non-Defaults (Ernährung/Speise/Verwendung/etc.)
  eigenschaften_excluded: [],
  eigenschaften_required: [],

  // Lore:
  lore_selected: [],

  // Saison:
  saison_selected: "",

  // Zutaten:
  zutaten_need: [],
  zutaten_nohave: [],

  // Nährstoffe:
  naehrstoffe_selected: [],

  // Suche:
  query: "",
};

// ============================================================
// CACHES
// ============================================================
let __CACHE_REZEPTE = null;
let __CACHE_EIGENSCHAFTEN = null;
let __CACHE_LORE = null;
let __CACHE_SAISON = null;
let __CACHE_ZUTATEN = null;
let __CACHE_NAEHRSTOFFE = null;

async function loadJsonOnce(url, key) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} (${url})`);
  const data = await res.json();
  const arr = Array.isArray(data?.[key]) ? data[key] : [];
  return arr;
}

async function loadRezepteOnce() {
  if (__CACHE_REZEPTE) return __CACHE_REZEPTE;
  const res = await fetch("./daten/rezepte.json");
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  __CACHE_REZEPTE = Array.isArray(data?.rezepte) ? data.rezepte : [];
  return __CACHE_REZEPTE;
}

async function loadEigenschaftenOnce() {
  if (__CACHE_EIGENSCHAFTEN) return __CACHE_EIGENSCHAFTEN;
  __CACHE_EIGENSCHAFTEN = await loadJsonOnce("./daten/eigenschaften.json", "eigenschaften");
  return __CACHE_EIGENSCHAFTEN;
}

async function loadLoreOnce() {
  if (__CACHE_LORE) return __CACHE_LORE;
  __CACHE_LORE = await loadJsonOnce("./daten/lore.json", "lore");
  return __CACHE_LORE;
}

async function loadSaisonOnce() {
  if (__CACHE_SAISON) return __CACHE_SAISON;
  __CACHE_SAISON = await loadJsonOnce("./daten/saison.json", "saison_labels");
  return __CACHE_SAISON;
}

async function loadZutatenOnce() {
  if (__CACHE_ZUTATEN) return __CACHE_ZUTATEN;
  __CACHE_ZUTATEN = await loadJsonOnce("./daten/zutaten.json", "zutaten");
  return __CACHE_ZUTATEN;
}

async function loadNaehrstoffeOnce() {
  if (__CACHE_NAEHRSTOFFE) return __CACHE_NAEHRSTOFFE;
  __CACHE_NAEHRSTOFFE = await loadJsonOnce("./daten/naehrstoffe.json", "naehrstoffe");
  return __CACHE_NAEHRSTOFFE;
}

// ============================================================
// DOM READY
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
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

    // Default: Allergen + Trigger sind ANGEHAKT (dürfen enthalten)
    defaultChecked: (entry) =>
      String(entry.gruppe) === "Allergen (enthält)" ||
      String(entry.gruppe) === "Unverträglichkeit / Trigger",

    // "deselect" Mode: Defaults zählen als "darf enthalten".
    // Abwählen = ausschliessen.
    badgeMode: "deselect",
    onChangeLogPrefix: "Eigenschaften",

    // Wenn sich etwas ändert -> Liste neu filtern
    onAnyChange: () => scheduleRenderRezepteListe(),
  });

  // Lore Dropdown
  initCheckboxDropdown({
    dropdownId: "loreDropdown",
    toggleId: "loreToggle",
    menuId: "loreMenu",
    title: "Lore",
    clearText: "Alle",
    jsonUrl: "./daten/lore.json",
    arrayKey: "lore",
    defaultChecked: () => false,
    onChangeLogPrefix: "Lore",
    formatLabel: (entry) => {
      let label = String(entry.label || "");
      if (String(entry.gruppe) === "Preis") {
        const coins = formatCoins(entry.preis);
        if (coins) label += ` (${coins})`;
      }
      return label;
    },
    onAnyChange: () => scheduleRenderRezepteListe(),
  });

  // Nährstoffe Dropdown
  initCheckboxDropdown({
    dropdownId: "nutrDropdown",
    toggleId: "nutrToggle",
    menuId: "nutrMenu",
    title: "Nährstoffe",
    clearText: "Alle",
    jsonUrl: "./daten/naehrstoffe.json",
    arrayKey: "naehrstoffe",
    defaultChecked: () => false,
    onChangeLogPrefix: "Nährstoffe",
    formatLabel: (entry) => {
      const label = String(entry.label || "");
      const unit = entry.einheit ? ` (${entry.einheit})` : "";
      return `${label}${unit}`;
    },
    onSelectionChange: (checkedIds) => {
      window.REZEPTE_FILTER.naehrstoffe_selected = (checkedIds || []).map(String);
      scheduleRenderRezepteListe();
    },
    onAnyChange: () => scheduleRenderRezepteListe(),
  });

  // Zutaten Dropdown (3 Zustände)
  initZutatenDropdown({
    dropdownId: "zutatenDropdown",
    toggleId: "zutatenToggle",
    menuId: "zutatenMenu",
    title: "Zutaten",
    clearText: "Alle",
    jsonUrl: "./daten/zutaten.json",
    arrayKey: "zutaten",
    propsMenuId: "propsMenu",
    onAnyChange: () => scheduleRenderRezepteListe(),
  });

  // Suche Input (kein id -> wir nehmen placeholder)
  const searchInput =
    document.querySelector('input[placeholder="Suche Rezept..."]') ||
    document.querySelector('input[placeholder*="Suche"]');

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.REZEPTE_FILTER.query = String(searchInput.value || "").trim();
      scheduleRenderRezepteListe();
    });
  }

  // initial render
  scheduleRenderRezepteListe();
});

// ============================================================
// THEME TOGGLE
// ============================================================
function initThemeToggle() {
  const STORAGE_KEY = "theme"; // "dark" | "light"
  const toggle = document.getElementById("themeToggle");

  // --- (B) Diese Funktion liest IMMER aus localStorage und setzt die Seite ---
  function applyThemeFromStorage() {
    const v = localStorage.getItem(STORAGE_KEY);
    const theme = v === "dark" || v === "light" ? v : "light";

    // WICHTIG: wir bleiben bei body.dark (damit dein CSS unverändert bleibt)
    document.body.classList.toggle("dark", theme === "dark");

    // Icon updaten (falls Button existiert)
    if (toggle) {
      toggle.textContent = theme === "dark" ? "☀️" : "🌙";
    }
  }

  // --- Initial: sofort anwenden ---
  applyThemeFromStorage();

  // Wenn es auf dieser Seite keinen Button gibt: trotzdem Sync aktivieren
  if (toggle) {
    // Doppel-Binding verhindern (wichtig bei rezept.js, weil du neu renderst)
    if (toggle.dataset.bound === "1") return;
    toggle.dataset.bound = "1";

    // --- (A) Klick ändert NUR localStorage, dann apply im aktuellen Tab ---
    toggle.addEventListener("click", () => {
      const cur = localStorage.getItem(STORAGE_KEY);
      const theme = cur === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, theme);
      applyThemeFromStorage(); // sofort im aktuellen Tab
    });
  }

  // --- Cross-Tab Sync: andere Tabs bekommen storage-event ---
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) applyThemeFromStorage();
  });

  // --- “immer wieder abfragen”: Polling (falls du es explizit so willst) ---
  let last = localStorage.getItem(STORAGE_KEY);
  setInterval(() => {
    const now = localStorage.getItem(STORAGE_KEY);
    if (now !== last) {
      last = now;
      applyThemeFromStorage();
    }
  }, 250);
}

// ============================================================
// SAISON SELECT
// ============================================================
function initSaisonSelect() {
  const select = document.getElementById("seasonSelect");
  if (!select) return;

  select.value = "";
  loadSaisonDataAndFillSelect(select).catch(console.error);

  select.addEventListener("change", (e) => {
    window.REZEPTE_FILTER.saison_selected = String(e.target.value || "");
    scheduleRenderRezepteListe();
  });
}

async function loadSaisonDataAndFillSelect(selectEl) {
  const list = await loadSaisonOnce();

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
  selectEl.value = "";
}

// ============================================================
// GENERISCHES DROPDOWN (Checkboxen)
// - gruppiert nach gruppe
// - optional untergruppe (details/summary)
// ============================================================
async function initCheckboxDropdown(cfg) {
  const toggleBtn = document.getElementById(cfg.toggleId);
  const menu = document.getElementById(cfg.menuId);

  const dd = cfg.dropdownId
    ? document.getElementById(cfg.dropdownId)
    : toggleBtn?.closest(".dropdown");

  if (!dd || !toggleBtn || !menu) return;

  menu.innerHTML = "";

  // Badge
  toggleBtn.querySelectorAll(".dropdown-badge").forEach((b) => b.remove());
  const badge = document.createElement("span");
  badge.className = "dropdown-badge";
  badge.hidden = true;
  badge.textContent = "";
  toggleBtn.appendChild(badge);

  // Header
  const head = document.createElement("li");
  head.innerHTML = `
    <div class="dropdown-menu__head">
      <div class="dropdown-menu__title">${escapeHtml(cfg.title)}</div>
      <button class="dropdown-menu__clear" type="button">${escapeHtml(cfg.clearText)}</button>
    </div>
  `;
  menu.appendChild(head);
  const clearBtn = head.querySelector("button");

  // Open/close
  toggleBtn.addEventListener("click", () => {
    const isOpen = dd.classList.toggle("open");
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!dd.contains(e.target)) {
      dd.classList.remove("open");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dd.classList.remove("open");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });

  // Load JSON
  const res = await fetch(cfg.jsonUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  const list = Array.isArray(data?.[cfg.arrayKey]) ? data[cfg.arrayKey] : [];

  // Group
  const byGroup = new Map();
  for (const item of list) {
    if (!item || !item.id || !item.label || !item.gruppe) continue;
    const group = String(item.gruppe);
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(item);
  }

  for (const [groupName, itemsRaw] of byGroup.entries()) {
    const items = [...itemsRaw].sort((a, b) => {
      const pa = Number(a.prioritaet ?? 9999);
      const pb = Number(b.prioritaet ?? 9999);
      if (pa !== pb) return pa - pb;
      return String(a.label || "").localeCompare(String(b.label || ""), "de");
    });

    const groupLi = document.createElement("li");
    groupLi.className = "dropdown-group";

    const title = document.createElement("p");
    title.className = "dropdown-group__title";
    title.textContent = groupName;
    groupLi.appendChild(title);

    // main entries
    for (const entry of items.filter((x) => !x.untergruppe)) {
      groupLi.appendChild(makeCheckboxRow(entry));
    }

    // subgroups
    const subGroups = new Map();
    for (const entry of items) {
      if (!entry.untergruppe) continue;
      const key = String(entry.untergruppe);
      if (!subGroups.has(key)) subGroups.set(key, []);
      subGroups.get(key).push(entry);
    }

    for (const [subName, subItems] of subGroups.entries()) {
      const details = document.createElement("details");
      details.className = "dropdown-subgroup";

      const summary = document.createElement("summary");
      summary.className = "dropdown-subgroup__summary";
      summary.textContent = subName;
      details.appendChild(summary);

      const box = document.createElement("div");
      box.className = "dropdown-subgroup__body";

      for (const entry of subItems) box.appendChild(makeCheckboxRow(entry));

      details.appendChild(box);
      groupLi.appendChild(details);
    }

    menu.appendChild(groupLi);
  }

  // Clear -> restore defaults
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      menu.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.checked = cb.dataset.default === "1";
      });
      updateBadgeAndState();
      if (typeof cfg.onAnyChange === "function") cfg.onAnyChange();
    });
  }

  updateBadgeAndState();

  // ---------- helpers ----------
  function makeCheckboxRow(entry) {
    const label = document.createElement("label");
    label.className = "dropdown-item";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = String(entry.id);

    let def = false;
    try {
      def = Boolean(cfg.defaultChecked?.(entry));
    } catch {
      def = false;
    }
    cb.checked = def;
    cb.dataset.default = def ? "1" : "0";

    const icon = document.createElement("span");
    icon.className = "dropdown-item__icon";
    icon.textContent = entry.icon || "";

    const text = document.createElement("span");
    text.textContent = cfg.formatLabel ? cfg.formatLabel(entry) : entry.label;

    label.appendChild(cb);
    label.appendChild(icon);
    label.appendChild(text);

    cb.addEventListener("change", () => {
      // In "deselect": nicht alle Defaults abwählen lassen
      if (cfg.badgeMode === "deselect") {
        const all = [...menu.querySelectorAll('input[type="checkbox"]')];
        const defaults = all.filter((x) => x.dataset.default === "1");
        const checkedDefaults = defaults.filter((x) => x.checked);

        if (!cb.checked && cb.dataset.default === "1" && checkedDefaults.length === 0) {
          cb.checked = true;
        }
      }

      updateBadgeAndState();
      if (typeof cfg.onAnyChange === "function") cfg.onAnyChange();
    });

    return label;
  }

  function updateBadgeAndState() {
    // deselect mode: compute excluded defaults + required non-defaults
    if (cfg.badgeMode === "deselect") {
      const all = [...menu.querySelectorAll('input[type="checkbox"]')];
      const defaults = all.filter((cb) => cb.dataset.default === "1");
      const nonDefaults = all.filter((cb) => cb.dataset.default === "0");

      const excluded = defaults.filter((cb) => !cb.checked).map((cb) => cb.value);
      const required = nonDefaults.filter((cb) => cb.checked).map((cb) => cb.value);

      // Badge zeigt: excluded + required (weil sonst sieht man nicht, dass man z.B. Picknick gesetzt hat)
      const badgeCount = excluded.length + required.length;
      badge.hidden = badgeCount === 0;
      badge.textContent = badgeCount ? String(badgeCount) : "";

      window.REZEPTE_FILTER.eigenschaften_excluded = excluded;
      window.REZEPTE_FILTER.eigenschaften_required = required;

      console.log("Eigenschaften ausgeschlossen:", excluded);
      console.log("Eigenschaften erforderlich:", required);
      return;
    }

    // standard mode: checked = selected
    const checked = [...menu.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value);

    badge.hidden = checked.length === 0;
    badge.textContent = checked.length ? String(checked.length) : "";

    if (cfg.onChangeLogPrefix) {
      console.log(`${cfg.onChangeLogPrefix} gewählt:`, checked.length ? checked : "Alle");
    }

    // store per dropdown
    if (cfg.arrayKey === "lore") window.REZEPTE_FILTER.lore_selected = checked;
    if (cfg.arrayKey === "naehrstoffe") window.REZEPTE_FILTER.naehrstoffe_selected = checked;

    if (typeof cfg.onSelectionChange === "function") cfg.onSelectionChange(checked);
  }
}

// ============================================================
// ZUTATEN DROPDOWN (allow / need / nohave)
// ============================================================
async function initZutatenDropdown(cfg) {
  const toggleBtn = document.getElementById(cfg.toggleId);
  const menu = document.getElementById(cfg.menuId);

  const dd = cfg.dropdownId
    ? document.getElementById(cfg.dropdownId)
    : toggleBtn?.closest(".dropdown");

  if (!dd || !toggleBtn || !menu) return;

  menu.innerHTML = "";

  // Badge
  toggleBtn.querySelectorAll(".dropdown-badge").forEach((b) => b.remove());
  const badge = document.createElement("span");
  badge.className = "dropdown-badge";
  badge.hidden = true;
  badge.textContent = "";
  toggleBtn.appendChild(badge);

  // Header
  const head = document.createElement("li");
  head.innerHTML = `
    <div class="dropdown-menu__head">
      <div class="dropdown-menu__title">${escapeHtml(cfg.title)}</div>
      <button class="dropdown-menu__clear" type="button">${escapeHtml(cfg.clearText)}</button>
    </div>
  `;
  menu.appendChild(head);
  const clearBtn = head.querySelector("button");

  // Open/close
  toggleBtn.addEventListener("click", () => {
    const isOpen = dd.classList.toggle("open");
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!dd.contains(e.target)) {
      dd.classList.remove("open");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dd.classList.remove("open");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });

  // Zutaten laden
  const res = await fetch(cfg.jsonUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  const list = Array.isArray(data?.[cfg.arrayKey]) ? data[cfg.arrayKey] : [];

  // state map
  const stateById = new Map();

  const items = [...list]
    .filter((z) => z && z.id && z.name)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "de"));

  for (const z of items) {
    const li = document.createElement("li");
    li.className = "dropdown-item dropdown-item--ingredient";
    li.dataset.ingredientId = String(z.id);

    const infoBtn = document.createElement("button");
    infoBtn.type = "button";
    infoBtn.className = "ingredient-info-btn";
    infoBtn.textContent = "ℹ️";
    infoBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openIngredientInfo(z);
    });

    const nameSpan = document.createElement("span");
    nameSpan.className = "dropdown-item__text";
    nameSpan.textContent = String(z.name);

    const controls = document.createElement("span");
    controls.className = "ingredient-state-controls";

    controls.appendChild(makeStateBtn("🟦", "kann enthalten", "allow", z.id));
    controls.appendChild(makeStateBtn("⭐", "muss enthalten", "need", z.id));
    controls.appendChild(makeStateBtn("🚫", "darf nicht enthalten", "nohave", z.id));

    li.appendChild(infoBtn);
    li.appendChild(nameSpan);
    li.appendChild(controls);

    menu.appendChild(li);
  }

  // default: allow
  for (const z of items) stateById.set(String(z.id), "allow");
  paintAllRows();

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      for (const z of items) stateById.set(String(z.id), "allow");
      paintAllRows();
      refreshDisabledStates();
      updateBadgeAndStore();
      if (typeof cfg.onAnyChange === "function") cfg.onAnyChange();
    });
  }

  const propsMenu = document.getElementById(cfg.propsMenuId);
  if (propsMenu) {
    propsMenu.addEventListener("change", () => {
      refreshDisabledStates();
      updateBadgeAndStore();
      if (typeof cfg.onAnyChange === "function") cfg.onAnyChange();
    });
  }

  refreshDisabledStates();
  updateBadgeAndStore();

  // ---------- helpers ----------
  function makeStateBtn(symbol, title, stateKey, ingredientId) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ingredient-state-btn";
    b.textContent = symbol;
    b.title = title;
    b.dataset.state = stateKey;
    b.dataset.ingredientId = String(ingredientId);
    b.dataset.active = "0";
    b.setAttribute("aria-pressed", "false");

    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const li = b.closest("li");
      if (li && li.dataset.disabled === "1") return;

      const id = String(ingredientId);
      stateById.set(id, stateKey);

      paintRow(id);
      updateBadgeAndStore();
      if (typeof cfg.onAnyChange === "function") cfg.onAnyChange();
    });

    return b;
  }

  function paintRow(id) {
    const li = menu.querySelector(
      `li.dropdown-item--ingredient[data-ingredient-id="${CSS.escape(String(id))}"]`,
    );
    if (!li) return;

    li.querySelectorAll(".ingredient-state-btn").forEach((btn) => {
      const isActive = (stateById.get(String(id)) || "allow") === btn.dataset.state;
      btn.dataset.active = isActive ? "1" : "0";
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function paintAllRows() {
    for (const z of items) paintRow(z.id);
  }

  function updateBadgeAndStore() {
    const need = [];
    const nohave = [];

    for (const [id, v] of stateById.entries()) {
      if (v === "need") need.push(id);
      else if (v === "nohave") nohave.push(id);
    }

    const count = need.length + nohave.length;
    badge.hidden = count === 0;
    badge.textContent = count ? String(count) : "";

    window.REZEPTE_FILTER.zutaten_need = need;
    window.REZEPTE_FILTER.zutaten_nohave = nohave;

    console.log("Zutaten need:", need);
    console.log("Zutaten nohave:", nohave);
  }

  function refreshDisabledStates() {
    const excludedProps = window.REZEPTE_FILTER.eigenschaften_excluded || [];
    if (!excludedProps.length) {
      menu.querySelectorAll("li.dropdown-item--ingredient").forEach((li) => {
        li.dataset.disabled = "0";
        li.style.opacity = "";
        li.style.pointerEvents = "";
        li.title = "";
      });
      return;
    }

    // Zutaten Daten map
    const zById = new Map(items.map((z) => [String(z.id), z]));

    menu.querySelectorAll("li.dropdown-item--ingredient").forEach((li) => {
      const id = String(li.dataset.ingredientId || "");
      const z = zById.get(id);
      const props = Array.isArray(z?.eigenschaften_ids) ? z.eigenschaften_ids.map(String) : [];

      const hits = props.filter((p) => excludedProps.includes(String(p)));
      const disabled = hits.length > 0;

      li.dataset.disabled = disabled ? "1" : "0";
      li.style.opacity = disabled ? "0.35" : "";
      li.style.pointerEvents = disabled ? "none" : "";
      li.title = disabled ? `Gesperrt wegen: ${hits.join(", ")}` : "";

      // wenn gesperrt -> Zustand zurück auf allow
      if (disabled) {
        stateById.set(id, "allow");
        paintRow(id);
      }
    });
  }

  function openIngredientInfo(z) {
    const imgPath = z?.bilder?.pfad ? String(z.bilder.pfad) : "";
    const imgAlt = z?.bilder?.alt ? String(z.bilder.alt) : String(z.name || "Zutat");

    const lager = z?.lagerung?.ort ? String(z.lagerung.ort) : "";
    const halt = Number.isFinite(z?.lagerung?.haltbarkeit_tage) ? `${z.lagerung.haltbarkeit_tage} Tage` : "";
    const tipps = Array.isArray(z?.lagerung?.tipps) ? z.lagerung.tipps : [];
    const schlecht = Array.isArray(z?.schlecht_erkennen) ? z.schlecht_erkennen : [];

    const saisonMonate = Array.isArray(z?.saison?.schweiz_monate) ? z.saison.schweiz_monate : [];
    const saisonLabel = Array.isArray(z?.saison?.alternativ_labels) ? z.saison.alternativ_labels.join(", ") : "";

    const kcal = z?.naehrwerte_pro_100g?.kcal ?? "";
    const protein = z?.naehrwerte_pro_100g?.protein_g ?? "";
    const fett = z?.naehrwerte_pro_100g?.fett_g ?? "";
    const kh = z?.naehrwerte_pro_100g?.kh_g ?? "";

    const html = `
      <div style="display:flex; gap:12px; align-items:flex-start;">
        ${imgPath ? `<img src="${escapeHtml(imgPath)}" alt="${escapeHtml(imgAlt)}" style="width:96px; height:96px; object-fit:cover; border-radius:12px;" />` : ""}
        <div style="flex:1;">
          <div style="font-weight:700; font-size:18px; margin-bottom:6px;">${escapeHtml(z.name || "")}</div>

          <div style="font-weight:600; margin-top:8px;">Lagerung</div>
          <div>${escapeHtml(lager)}${halt ? ` • ${escapeHtml(halt)}` : ""}</div>
          ${tipps.length ? `<ul style="margin:6px 0 0 18px;">${tipps.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : ""}

          <div style="font-weight:600; margin-top:10px;">Saison (CH)</div>
          <div>${saisonLabel || (saisonMonate.length ? `Monate: ${saisonMonate.join(", ")}` : "Ganzjährig")}</div>

          ${
            schlecht.length
              ? `<div style="font-weight:600; margin-top:10px;">Schlecht erkennen</div>
                 <ul style="margin:6px 0 0 18px;">${schlecht.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
              : ""
          }

          <div style="font-weight:600; margin-top:10px;">Nährwerte / 100g</div>
          <div>Kcal: ${escapeHtml(kcal)} • Protein: ${escapeHtml(protein)}g • Fett: ${escapeHtml(fett)}g • KH: ${escapeHtml(kh)}g</div>
        </div>
      </div>
    `;

    let dlg = document.getElementById("ingredientDialog");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "ingredientDialog";
      dlg.style.maxWidth = "720px";
      dlg.style.width = "calc(100% - 24px)";
      dlg.style.border = "none";
      dlg.style.borderRadius = "16px";
      dlg.style.padding = "14px";
      dlg.innerHTML = `
        <form method="dialog">
          <div id="ingredientDialogBody"></div>
          <div style="display:flex; justify-content:flex-end; margin-top:12px;">
            <button type="submit">Schliessen</button>
          </div>
        </form>
      `;
      document.body.appendChild(dlg);
    }

    dlg.querySelector("#ingredientDialogBody").innerHTML = html;
    dlg.showModal();
  }
}

// ============================================================
// REZEPTLISTE (FILTER + RENDER)
// ============================================================

let __RENDER_TIMER = null;
function scheduleRenderRezepteListe() {
  clearTimeout(__RENDER_TIMER);
  __RENDER_TIMER = setTimeout(() => {
    renderRezepteListe().catch(console.error);
  }, 60);
}

async function renderRezepteListe() {
  const container = document.getElementById("rezepteListe");
  if (!container) return;

  const [rezepte, eigenschaften, lore, zutaten, saisonLabels, naehrstoffe] =
    await Promise.all([
      loadRezepteOnce(),
      loadEigenschaftenOnce(),
      loadLoreOnce(),
      loadZutatenOnce(),
      loadSaisonOnce(),
      loadNaehrstoffeOnce(),
    ]);

  const eigById = new Map(eigenschaften.map((e) => [String(e.id), e]));
  const loreById = new Map(lore.map((l) => [String(l.id), l]));
  const zutatById = new Map(zutaten.map((z) => [String(z.id), z]));
  const saisonById = new Map(saisonLabels.map((s) => [String(s.id), s]));
  const nutrById = new Map(naehrstoffe.map((n) => [String(n.id), n]));

  // resolve season months
  const seasonId = String(window.REZEPTE_FILTER.saison_selected || "");
  const seasonMonths = resolveSeasonMonths(seasonId, saisonById); // [] = no filter

  // filter state
  const excludedProps = (window.REZEPTE_FILTER.eigenschaften_excluded || []).map(String);
  const requiredProps = (window.REZEPTE_FILTER.eigenschaften_required || []).map(String);
  const selectedLore = (window.REZEPTE_FILTER.lore_selected || []).map(String);
  const needZutaten = (window.REZEPTE_FILTER.zutaten_need || []).map(String);
  const nohaveZutaten = (window.REZEPTE_FILTER.zutaten_nohave || []).map(String);
  const query = String(window.REZEPTE_FILTER.query || "").toLowerCase();

  // nutrient selection -> sort
  const selectedNutrients = (window.REZEPTE_FILTER.naehrstoffe_selected || []).map(String);

  // filter
  let filtered = rezepte.filter((r) => {
    const rid = String(r?.id || "");
    const titel = String(r?.titel || "");

    const recipeEigIds = normalizeArray(r?.tags?.eigenschaften ?? r?.eigenschaften_ids);
    const recipeLoreIds = normalizeArray(r?.tags?.lore ?? r?.lore_ids);

    const ingredientIds = extractIngredientIds(r);

    // ingredient props union
    const ingredientProps = new Set();
    for (const zid of ingredientIds) {
      const z = zutatById.get(zid);
      const props = Array.isArray(z?.eigenschaften_ids) ? z.eigenschaften_ids : [];
      props.forEach((p) => ingredientProps.add(String(p)));
    }

    // allergen props from recipe (alg_ei -> prop_enthaelt_ei)
    const allergenProps = new Set();
    const enthaelt = normalizeArray(r?.allergene?.enthaelt);
    for (const a of enthaelt) {
      if (a.startsWith("alg_")) allergenProps.add(`prop_enthaelt_${a.slice(4)}`);
    }

    // ----- EXCLUSIONS (strict) -----
    // If any excluded prop hits recipeEigIds OR ingredientProps OR allergenProps -> reject
    if (excludedProps.length) {
      for (const p of excludedProps) {
        if (recipeEigIds.includes(p)) return false;
        if (ingredientProps.has(p)) return false;
        if (allergenProps.has(p)) return false;
      }
    }

    // ----- REQUIRED properties -----
    // If user checked e.g. Picknick/Unterwegs -> recipe must include them (recipe tags preferred),
    // fallback: ingredientProps also counts (z.B. wenn du sowas später auf Zutaten legst).
    if (requiredProps.length) {
      for (const p of requiredProps) {
        if (!recipeEigIds.includes(p) && !ingredientProps.has(p)) return false;
      }
    }

    // ----- LORE -----
    // strict: all selected lore ids must be present
    if (selectedLore.length) {
      for (const lid of selectedLore) {
        if (!recipeLoreIds.includes(lid)) return false;
      }
    }

    // ----- ZUTATEN must contain -----
    if (needZutaten.length) {
      for (const zid of needZutaten) {
        if (!ingredientIds.includes(zid)) return false;
      }
    }

    // ----- ZUTATEN must NOT contain -----
    if (nohaveZutaten.length) {
      for (const zid of nohaveZutaten) {
        if (ingredientIds.includes(zid)) return false;
      }
    }

    // ----- SAISON -----
    // strict: every ingredient that has months defined must intersect seasonMonths
    if (seasonMonths.length) {
      for (const zid of ingredientIds) {
        const z = zutatById.get(zid);
        const months = Array.isArray(z?.saison?.schweiz_monate) ? z.saison.schweiz_monate : [];
        if (months.length) {
          if (!months.some((m) => seasonMonths.includes(Number(m)))) return false;
        }
      }
    }

    // ----- SEARCH -----
    if (query) {
      // haystack: title + eig labels + lore labels + ingredient names
      const eigText = recipeEigIds
        .map((id) => eigById.get(id)?.label || id)
        .join(" ");
      const loreText = recipeLoreIds
        .map((id) => loreById.get(id)?.label || id)
        .join(" ");
      const ingText = ingredientIds
        .map((id) => zutatById.get(id)?.name || id)
        .join(" ");

      const hay = `${titel} ${eigText} ${loreText} ${ingText}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }

    return true;
  });

  // sort by nutrients if selected, else by title
  if (selectedNutrients.length) {
    const selected = selectedNutrients.map((id) => nutrById.get(id)).filter(Boolean);
    const maxById = new Map();

    for (const n of selected) {
      const q = String(n.quelle || "");
      let max = 0;
      for (const r of rezepte) {
        const v = getByPath(r, q);
        if (v > max) max = v;
      }
      maxById.set(String(n.id), max);
    }

    filtered = filtered
      .map((r) => {
        let score = 0;
        for (const n of selected) {
          const id = String(n.id);
          const max = Number(maxById.get(id) || 0);
          const v = getByPath(r, n.quelle);
          score += max > 0 ? v / max : 0;
        }
        return { r, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.r);
  } else {
    filtered.sort((a, b) => String(a?.titel || "").localeCompare(String(b?.titel || ""), "de"));
  }

  // render
  container.innerHTML = "";

  for (const r of filtered) {
    const titel = String(r?.titel || "");
    const id = String(r?.id || "");
    const bildPfad = r?.bild?.pfad ? String(r.bild.pfad) : String(r?.bild || "");
    const bildAlt = r?.bild?.alt ? String(r.bild.alt) : titel;

    const recipeEigIds = normalizeArray(r?.tags?.eigenschaften ?? r?.eigenschaften_ids);
    const recipeLoreIds = normalizeArray(r?.tags?.lore ?? r?.lore_ids);

    // groups for display
    const erlaubteGruppen = ["Ernährung", "Allergen (enthält)", "Speise", "Verwendung"];
    const gruppiert = {};
    erlaubteGruppen.forEach((g) => (gruppiert[g] = []));

    for (const eid of recipeEigIds) {
      const obj = eigById.get(String(eid));
      if (!obj) continue;
      if (erlaubteGruppen.includes(String(obj.gruppe))) gruppiert[String(obj.gruppe)].push(obj);
    }

    const eigenschaftenHTML = erlaubteGruppen
      .map((gruppe) => {
        const liste = gruppiert[gruppe] || [];
        if (!liste.length) return "";

        const chips = liste
          .map((e) => `<span class="tag-chip">${escapeHtml(e.icon || "")} ${escapeHtml(e.label || "")}</span>`)
          .join("");

        return `
          <div class="prop-group">
            <div class="prop-group-title">${escapeHtml(gruppe)}</div>
            <div class="prop-items">${chips}</div>
          </div>
        `;
      })
      .join("");

    const loreText = recipeLoreIds
      .map((lid) => loreById.get(String(lid))?.label || String(lid))
      .filter(Boolean)
      .join(", ");

    // Link target (später deine Detailseite)
    const href = `rezept.html?id=${encodeURIComponent(id)}`;

    const a = document.createElement("a");
    a.className = "rezept-card";
    a.href = href;
    a.setAttribute("data-rezept-id", id);

    a.innerHTML = `
      <div class="rezept-meta">
        <h3 class="rezept-title">${escapeHtml(titel)}</h3>

        <div class="rezept-eigenschaften">
          ${eigenschaftenHTML || ""}
        </div>

        ${loreText ? `<div class="rezept-lore">${escapeHtml(loreText)}</div>` : ""}
      </div>

      <div class="rezept-media">
        ${bildPfad ? `<img src="${escapeHtml(bildPfad)}" alt="${escapeHtml(bildAlt)}" class="rezept-bild" />` : ""}
      </div>
    `;

    container.appendChild(a);
  }
}

// ============================================================
// HELPERS: recipe ingredients / season / normalize / nutrients path
// ============================================================
function normalizeArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") {
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function extractIngredientIds(recipe) {
  // expects:
  // recipe.inhalt.zutatenlisten[] -> { posten: [ { zutat_id: "..." }, ... ] }
  const out = [];
  const lists = recipe?.inhalt?.zutatenlisten;
  if (!Array.isArray(lists)) return out;

  for (const l of lists) {
    const posten = Array.isArray(l?.posten) ? l.posten : [];
    for (const p of posten) {
      const zid = p?.zutat_id ? String(p.zutat_id) : "";
      if (zid) out.push(zid);
    }
  }

  // unique
  return [...new Set(out)];
}

function resolveSeasonMonths(seasonId, saisonById) {
  if (!seasonId) return [];
  const entry = saisonById.get(String(seasonId));
  if (!entry) return [];

  // season has monate in saison.json
  const months = Array.isArray(entry?.monate) ? entry.monate : [];
  return months.map(Number).filter((n) => Number.isFinite(n));
}

// path helper: supports "rezepte.xxx.yyy" and plain
function getByPath(obj, path) {
  if (!obj || !path) return 0;

  let p = String(path);
  if (p.startsWith("rezepte.")) p = p.slice("rezepte.".length);

  const parts = p.split(".");
  let cur = obj;
  for (const key of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, key)) cur = cur[key];
    else return 0;
  }

  const n = Number(cur);
  return Number.isFinite(n) ? n : 0;
}

// ============================================================
// ESCAPE + COINS
// ============================================================
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCoins(preisObj) {
  if (!preisObj || typeof preisObj !== "object") return "";

  const parts = [];
  const gm = Number(preisObj.gm || 0);
  const sm = Number(preisObj.sm || 0);
  const km = Number(preisObj.km || 0);

  if (gm > 0) parts.push(`${gm} GM`);
  if (sm > 0) parts.push(`${sm} SM`);
  if (km > 0) parts.push(`${km} KM`);

  return parts.join(", ");
}