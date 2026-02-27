"use strict";

/**
 * ============================================================
 * startseite.js
 * ============================================================
 * - Theme umschalten (Hell/Dunkel)
 * - Saison/Monat-Select aus daten/saison.json füllen
 * - Eigenschaften-Dropdown (Checkboxen) aus daten/eigenschaften.json füllen
 * - Lore-Dropdown (Checkboxen) aus daten/lore.json füllen
 * - Zutaten-Dropdown (3 Zustände + Info + Sperren durch Eigenschaften)
 *
 * WICHTIG (HTML IDs):
 * - Saison Select:      #seasonSelect
 * - Theme Toggle:       #themeToggle
 *
 * - Eigenschaften:
 *    Button:            #propsToggle
 *    Menü:              #propsMenu
 *
 * - Lore:
 *    Wrapper:           #loreDropdown
 *    Button:            #loreToggle
 *    Menü:              #loreMenu
 *
 * - Zutaten:
 *    Wrapper:           #zutatenDropdown
 *    Button:            #zutatenToggle
 *    Menü:              #zutatenMenu
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

    // ✅ Standard: Alles in diesen Gruppen ist ANGEHAKT (erlaubt)
    // Abwählen = ausschliessen
    defaultChecked: (entry) =>
      String(entry.gruppe) === "Allergen (enthält)" ||
      String(entry.gruppe) === "Unverträglichkeit / Trigger",

    // Badge zählt ausgeschlossene (abwählte Defaults)
    badgeMode: "deselect",
    onChangeLogPrefix: "Eigenschaften",
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

    // ✅ Text im Dropdown anpassen (nur Lore)
    formatLabel: (entry) => {
      let label = String(entry.label || "");
      if (String(entry.gruppe) === "Preis") {
        const coins = formatCoins(entry.preis);
        if (coins) label += ` (${coins})`;
      }
      return label;
    },
  });

  // Zutaten Dropdown (3 Zustände + Info + Sperren durch Eigenschaften)
  initZutatenDropdown({
    dropdownId: "zutatenDropdown",
    toggleId: "zutatenToggle",
    menuId: "zutatenMenu",
    title: "Zutaten",
    clearText: "Alle",
    jsonUrl: "./daten/zutaten.json",
    arrayKey: "zutaten",
    propsMenuId: "propsMenu",
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
// GENERISCHES DROPDOWN (Checkboxen) – für Eigenschaften UND Lore
// ============================================================

/**
 * Gruppiert nach entry.gruppe.
 * Unterstützt optionale entry.untergruppe (einklappbar).
 */
async function initCheckboxDropdown(cfg) {
  const toggleBtn = document.getElementById(cfg.toggleId);
  const menu = document.getElementById(cfg.menuId);

  const dd = cfg.dropdownId
    ? document.getElementById(cfg.dropdownId)
    : toggleBtn?.closest(".dropdown");

  if (!dd || !toggleBtn || !menu) {
    console.warn(
      `Dropdown fehlt: ${cfg.dropdownId || "(auto .dropdown)"}/${cfg.toggleId}/${cfg.menuId} (bitte HTML IDs prüfen).`,
    );
    return;
  }

  menu.innerHTML = "";

  // Badge am Button
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

    // Haupt-Einträge (ohne untergruppe)
    for (const entry of items.filter((x) => !x.untergruppe)) {
      groupLi.appendChild(makeCheckboxRow(entry));
    }

    // Untergruppen (einklappbar)
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

      for (const entry of subItems) {
        box.appendChild(makeCheckboxRow(entry));
      }

      details.appendChild(box);
      groupLi.appendChild(details);
    }

    menu.appendChild(groupLi);
  }

  // "Alle" -> Standardzustand wiederherstellen
  // ✅ Standard: alles auf "kann enthalten"
  for (const z of items) {
    stateById.set(String(z.id), "allow");
    const li = menu.querySelector(`li.dropdown-item--ingredient[data-ingredient-id="${CSS.escape(String(z.id))}"]`);
    if (li) {
      li.querySelectorAll(".ingredient-state-btn").forEach((b) => {
        const isActive = b.dataset.state === "allow";
        b.dataset.active = isActive ? "1" : "0";
        b.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      menu.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.checked = cb.dataset.default === "1";
      });
      updateBadgeAndLog();
    });
  }

  updateBadgeAndLog();

  // ---------- helpers ----------
  function makeCheckboxRow(entry) {
    const label = document.createElement("label");
    label.className = "dropdown-item";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = String(entry.id);

    // Standardzustand
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
      // ✅ Im "deselect" Modus (Eigenschaften): nie alles abwählen lassen.
      // Standard = "kann enthalten" (Default-Checkboxen sind an).
      if (cfg.badgeMode === "deselect") {
        const defaults = [...menu.querySelectorAll('input[type="checkbox"]')].filter(
          (x) => x.dataset.default === "1",
        );

        const checkedDefaults = defaults.filter((x) => x.checked);

        // Wenn der User gerade die letzte Default-Option abwählen will -> blocken
        if (!cb.checked && cb.dataset.default === "1" && checkedDefaults.length === 0) {
          cb.checked = true;
        }
      }

      updateBadgeAndLog();
    });

    return label;
  }

  function updateBadgeAndLog() {
    // Modus: Abwählen = Ausschliessen
    if (cfg.badgeMode === "deselect") {
      const all = [...menu.querySelectorAll('input[type="checkbox"]')];
      const defaults = all.filter((cb) => cb.dataset.default === "1");
      const excluded = defaults.filter((cb) => !cb.checked).map((cb) => cb.value);

      if (excluded.length === 0) {
        badge.hidden = true;
        badge.textContent = "";
        console.log(`${cfg.onChangeLogPrefix}:`, "Alle");
      } else {
        badge.hidden = false;
        badge.textContent = String(excluded.length);
        console.log(`${cfg.onChangeLogPrefix} ausgeschlossen:`, excluded);
      }

      // Optional global
      window.REZEPTE_FILTER = window.REZEPTE_FILTER || {};
      window.REZEPTE_FILTER.eigenschaften_excluded = excluded;
      return;
    }

    // Standard-Modus: angehakt = ausgewählt
    const checked = [...menu.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value);

    if (checked.length === 0) {
      badge.hidden = true;
      badge.textContent = "";
      console.log(`${cfg.onChangeLogPrefix}:`, "Alle");
    } else {
      badge.hidden = false;
      badge.textContent = String(checked.length);
      console.log(`${cfg.onChangeLogPrefix} gewählt:`, checked);
    }
  }
}

// ============================================================
// ZUTATEN DROPDOWN (3 Zustände + Info + Sperren durch Eigenschaften)
// ============================================================
async function initZutatenDropdown(cfg) {
  const toggleBtn = document.getElementById(cfg.toggleId);
  const menu = document.getElementById(cfg.menuId);

  const dd = cfg.dropdownId
    ? document.getElementById(cfg.dropdownId)
    : toggleBtn?.closest(".dropdown");

  if (!dd || !toggleBtn || !menu) {
    console.warn(
      `Zutaten-Dropdown fehlt: ${cfg.dropdownId || "(auto .dropdown)"}/${cfg.toggleId}/${cfg.menuId} (bitte HTML IDs prüfen).`,
    );
    return;
  }

  menu.innerHTML = "";

  // Badge am Button
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

  // Öffnen/Schliessen
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

  // Zustände: need/have/nohave/""
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

  // ✅ Standard: alles auf "kann enthalten"
  for (const z of items) {
    stateById.set(String(z.id), "allow");
    const li = menu.querySelector(`li.dropdown-item--ingredient[data-ingredient-id="${CSS.escape(String(z.id))}"]`);
    if (li) {
      li.querySelectorAll(".ingredient-state-btn").forEach((b) => {
        const isActive = b.dataset.state === "allow";
        b.dataset.active = isActive ? "1" : "0";
        b.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      // ✅ Reset auf Standard: alles "kann enthalten"
      for (const z of items) {
        stateById.set(String(z.id), "allow");
      }

      menu.querySelectorAll("li.dropdown-item--ingredient").forEach((li) => {
        li.querySelectorAll(".ingredient-state-btn").forEach((b) => {
          const isActive = b.dataset.state === "allow";
          b.dataset.active = isActive ? "1" : "0";
          b.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
      });

      updateBadge();
      refreshDisabledStates();
      logState();
    });
  }

  const propsMenu = document.getElementById(cfg.propsMenuId);
  if (propsMenu) {
    propsMenu.addEventListener("change", () => {
      refreshDisabledStates();
    });
  }

  refreshDisabledStates();
  updateBadge();
  logState();

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
      const current = stateById.get(id) || "allow";

      // ✅ Nie leer werden lassen:
      // Klick setzt einfach den Zustand, ohne Toggle-aus
      const next = stateKey;
      stateById.set(id, next);

      const row = b.closest("li");
      if (row) {
        row.querySelectorAll(".ingredient-state-btn").forEach((x) => {
          const isActive = (stateById.get(id) || "") === x.dataset.state;
          x.dataset.active = isActive ? "1" : "0";
          x.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
      }

      updateBadge();
      logState();
    });

    return b;
  }

  function updateBadge() {
    let count = 0;
    for (const v of stateById.values()) {
      if (v === "need" || v === "nohave") count++;
    }

    if (count === 0) {
      badge.hidden = true;
      badge.textContent = "";
      return;
    }
    badge.hidden = false;
    badge.textContent = String(count);
  }

  function logState() {
    const allow = [];
    const need = [];
    const nohave = [];

    for (const [id, v] of stateById.entries()) {
      if (v === "need") need.push(id);
      else if (v === "have") have.push(id);
      else if (v === "nohave") nohave.push(id);
    }

    window.REZEPTE_FILTER = window.REZEPTE_FILTER || {};
    window.REZEPTE_FILTER.zutaten_need = need;
    window.REZEPTE_FILTER.zutaten_have = have;
    window.REZEPTE_FILTER.zutaten_nohave = nohave;

    console.log("Zutaten (need):", need);
    console.log("Zutaten (have):", have);
    console.log("Zutaten (nohave):", nohave);
  }

  function refreshDisabledStates() {
    const excludedProps = getExcludedEigenschaftenIds(cfg.propsMenuId);

    // keine Excludes -> alles aktiv
    if (!excludedProps.length) {
      menu.querySelectorAll("li.dropdown-item--ingredient").forEach((li) => {
        li.dataset.disabled = "0";
        li.style.opacity = "";
        li.style.pointerEvents = "";
        li.title = "";
      });
      return;
    }

    const zById = new Map(items.map((z) => [String(z.id), z]));

    menu.querySelectorAll("li.dropdown-item--ingredient").forEach((li) => {
      const id = String(li.dataset.ingredientId || "");
      const z = zById.get(id);
      const props = Array.isArray(z?.eigenschaften_ids) ? z.eigenschaften_ids : [];

      const hits = props.filter((p) => excludedProps.includes(String(p)));
      const disabled = hits.length > 0;

      li.dataset.disabled = disabled ? "1" : "0";
      li.style.opacity = disabled ? "0.35" : "";
      li.style.pointerEvents = disabled ? "none" : "";
      li.title = disabled ? `Gesperrt wegen: ${hits.join(", ")}` : "";

      // wenn gesperrt: Zustand löschen
      if (disabled) {
        stateById.set(id, "");
        li.querySelectorAll(".ingredient-state-btn").forEach((b) => {
          b.dataset.active = "0";
          b.setAttribute("aria-pressed", "false");
        });
      }
    });

    updateBadge();
    logState();
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

          ${schlecht.length ? `<div style="font-weight:600; margin-top:10px;">Schlecht erkennen</div>
          <ul style="margin:6px 0 0 18px;">${schlecht.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : ""}

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

    const body = dlg.querySelector("#ingredientDialogBody");
    body.innerHTML = html;
    dlg.showModal();
  }
}

// ============================================================
// Helper: excluded Eigenschaften (abwählte Defaults)
// ============================================================
function getExcludedEigenschaftenIds(propsMenuId) {
  const menu = document.getElementById(propsMenuId);
  if (!menu) return [];

  const all = [...menu.querySelectorAll('input[type="checkbox"]')];
  const defaults = all.filter((cb) => cb.dataset.default === "1");
  return defaults.filter((cb) => !cb.checked).map((cb) => cb.value);
}

// ============================================================
// Helper: Escape + Coins
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