"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // ===== Dark/Light Toggle (B1) =====
  const toggle = document.getElementById("themeToggle");
  toggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    toggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  });

  // ===== Seasonal Select befüllen =====
  const select = document.getElementById("seasonSelect");

  // Sicherheits-Reset: Standard soll IMMER "Alle" bleiben
  select.value = "";

  loadSaisonDataAndFillSelect(select).catch((err) => {
    console.error("Fehler beim Laden von daten/saison.json:", err);
  });

  select.addEventListener("change", (e) => {
    console.log("Gewählt:", e.target.value); // "" = Alle
  });
});

async function loadSaisonDataAndFillSelect(selectEl) {
  const res = await fetch("./daten/saison.json");
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  const data = await res.json();
  const list = Array.isArray(data.saison_labels) ? data.saison_labels : [];

  const optgroupSeasons = document.createElement("optgroup");
  optgroupSeasons.label = "Jahreszeiten";

  const optgroupMonths = document.createElement("optgroup");
  optgroupMonths.label = "Monate";

  list.forEach((entry) => {
    if (!entry || !entry.id || !entry.label) return;

    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.label;

    if (String(entry.id).startsWith("saison_")) {
      optgroupSeasons.appendChild(option);
    } else {
      optgroupMonths.appendChild(option);
    }
  });

  selectEl.appendChild(optgroupSeasons);
  selectEl.appendChild(optgroupMonths);

  // WICHTIG: Keine automatische Auswahl -> bleibt "Alle"
  selectEl.value = "";
}

initEigenschaftenBootstrapLikeDropdown().catch((err) => {
  console.error("Fehler beim Dropdown Eigenschaften:", err);
});

async function initEigenschaftenBootstrapLikeDropdown() {
  const dd = document.querySelector(".dropdown");
  const toggleBtn = document.getElementById("propsToggle");
  const menu = document.getElementById("propsMenu");

  if (!dd || !toggleBtn || !menu) {
    console.warn("Dropdown Elemente nicht gefunden (dropdown/propsToggle/propsMenu).");
    return;
  }

  // Badge am Button (z.B. (3))
  const badge = document.createElement("span");
  badge.className = "dropdown-badge";
  badge.hidden = true;
  toggleBtn.appendChild(badge);

  // Menü-Header (Titel + Alle)
  const head = document.createElement("li");
  head.innerHTML = `
    <div class="dropdown-menu__head">
      <div class="dropdown-menu__title">Eigenschaften</div>
      <button class="dropdown-menu__clear" type="button" id="propsClearBtn">Alle</button>
    </div>
  `;
  menu.appendChild(head);

  const clearBtn = head.querySelector("#propsClearBtn");

  // Öffnen/Schliessen (wie Bootstrap)
  toggleBtn.addEventListener("click", () => {
    const isOpen = dd.classList.toggle("open");
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
  });

  // Klick ausserhalb -> schliessen
  document.addEventListener("click", (e) => {
    if (!dd.contains(e.target)) {
      dd.classList.remove("open");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });

  // ESC -> schliessen
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dd.classList.remove("open");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });

  // Daten laden
  const res = await fetch("./daten/eigenschaften.json");
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();

  const list = Array.isArray(data.eigenschaften) ? data.eigenschaften : [];

  // Nach Gruppen sortieren (Map: gruppe -> items)
  const byGroup = new Map();
  for (const item of list) {
    if (!item || !item.id || !item.label || !item.gruppe) continue;
    if (!byGroup.has(item.gruppe)) byGroup.set(item.gruppe, []);
    byGroup.get(item.gruppe).push(item);
  }

  // Gruppen ins Menü rendern
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
      cb.value = entry.id;

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

  // Alle klicken -> alles aus
  clearBtn.addEventListener("click", () => {
    menu.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = false));
    updateBadgeAndLog();
  });

  // Startzustand
  updateBadgeAndLog();

  function updateBadgeAndLog() {
    const checked = [...menu.querySelectorAll('input[type="checkbox"]:checked')].map(
      (cb) => cb.value
    );

    if (checked.length === 0) {
      badge.hidden = true;
      badge.textContent = "";
      console.log("Eigenschaften:", "Alle");
    } else {
      badge.hidden = false;
      badge.textContent = String(checked.length);
      console.log("Eigenschaften gewählt:", checked);
    }
  }
}