"use strict";

/**
 * ============================================================
 * startseite.js
 * ============================================================
 * - Theme umschalten (Hell/Dunkel)
 * - Saison/Monat-Select aus daten/saison.json füllen
 * - Eigenschaften-Dropdown mit Checkboxen aus daten/eigenschaften.json füllen
 */

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initSaisonSelect();
  initEigenschaftenDropdown();
});

// ============================================================
// THEME TOGGLE
// ============================================================
function initThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

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
  if (!select) return;

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
// EIGENSCHAFTEN DROPDOWN
// ============================================================
function initEigenschaftenDropdown() {
  initEigenschaftenBootstrapLikeDropdown().catch((err) => {
    console.error("Fehler beim Dropdown Eigenschaften:", err);
  });
}

async function initEigenschaftenBootstrapLikeDropdown() {
  const dd = document.querySelector(".dropdown");
  const toggleBtn = document.getElementById("propsToggle");
  const menu = document.getElementById("propsMenu");

  if (!dd || !toggleBtn || !menu) return;

  // Badge (Zähler) am Button erstellen
  const badge = document.createElement("span");
  badge.className = "dropdown-badge";
  badge.hidden = true;
  badge.textContent = "";
  toggleBtn.appendChild(badge);

  // Header im Dropdown (Titel + "Alle")
  const head = document.createElement("li");
  head.innerHTML = `
    <div class="dropdown-menu__head">
      <div class="dropdown-menu__title">Eigenschaften</div>
      <button class="dropdown-menu__clear" type="button" id="propsClearBtn">Alle</button>
    </div>
  `;
  menu.appendChild(head);

  const clearBtn = head.querySelector("#propsClearBtn");

  // Dropdown öffnen/schliessen
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
  const res = await fetch("./daten/eigenschaften.json");
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  const list = Array.isArray(data.eigenschaften) ? data.eigenschaften : [];

  // Nach Gruppen sortieren
  const byGroup = new Map();
  for (const item of list) {
    if (!item || !item.id || !item.label || !item.gruppe) continue;
    if (!byGroup.has(item.gruppe)) byGroup.set(item.gruppe, []);
    byGroup.get(item.gruppe).push(item);
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

      // ✅ Standard: Alles was "prop_enthaelt_" ist, automatisch anhaken
      // (User kann es danach bewusst abwählen)
      if (cb.value.startsWith("prop_enthaelt_")) cb.checked = true;

      const icon = document.createElement("span");
      icon.className = "dropdown-item__icon";
      icon.textContent = entry.icon || "";

      const text = document.createElement("span");
      text.textContent = entry.label;

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

  // ✅ Startzustand: Badge aktualisieren (nach Auto-Checks)
  updateBadgeAndLog();

  function updateBadgeAndLog() {
    const checked = [...menu.querySelectorAll('input[type="checkbox"]:checked')].map(
      (cb) => cb.value
    );

    if (checked.length === 0) {
      badge.hidden = true;
      badge.textContent = "";
      console.log("Eigenschaften:", "Alle");
      return;
    }

    badge.hidden = false;
    badge.textContent = String(checked.length);
    console.log("Eigenschaften gewählt:", checked);
  }
}