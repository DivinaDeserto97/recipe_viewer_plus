"use strict";

/**
 * rezept.js
 * - Lädt rezept via ?id=...
 * - Rendert: 1 Zutatenliste 2 Geschichte 3 Einkaufsliste 4 Anleitung 5 Bild
 * - Nutzt deine aktuelle rezepte.json Struktur:
 *   - r.id, r.titel, r.bild (string), r.basis_portionen
 *   - r.tags.eigenschaften[], r.tags.lore[]
 *   - r.inhalt.geschichte (kurz, setting, ritual[])
 *   - r.inhalt.zutatenlisten[] -> { titel, posten[] }
 *   - r.inhalt.schritte[] -> { nr, titel, text, zeit_min, notizen[] }
 *   - r.einkaufsliste[] -> { gruppe, items:[{zutat_id, menge, einheit, notizen[]}] }
 */

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initRezeptPage().catch((err) => {
    console.error(err);
    renderFatalError(
      "Fehler beim Laden des Rezepts",
      err?.message || String(err),
    );
  });
});

async function initRezeptPage() {
  const recipeId = getQueryParam("id");
  if (!recipeId) {
    renderFatalError("Kein Rezept gewählt", "Es fehlt ?id=... in der URL.");
    return;
  }

  const [rezepte, eigenschaften, lore, zutaten] = await Promise.all([
    loadJson("./daten/rezepte.json", "rezepte"),
    loadJson("./daten/eigenschaften.json", "eigenschaften"),
    loadJson("./daten/lore.json", "lore"),
    loadJson("./daten/zutaten.json", "zutaten"),
  ]);

  const r = rezepte.find((x) => String(x?.id) === String(recipeId));
  if (!r) {
    renderFatalError(
      "Rezept nicht gefunden",
      `id="${escapeHtml(recipeId)}" existiert nicht in rezepte.json`,
    );
    return;
  }

  const eigById = new Map(eigenschaften.map((e) => [String(e.id), e]));
  const loreById = new Map(lore.map((l) => [String(l.id), l]));
  const zutatById = new Map(zutaten.map((z) => [String(z.id), z]));

  renderRezept(r, { eigById, loreById, zutatById });
}

function renderRezept(r, ctx) {
  const root = ensureRoot();

  const titel = String(r?.titel || "");
  const bildPfad = r?.bild?.pfad ? String(r.bild.pfad) : String(r?.bild || "");
  const basisPortionen = toNumberOr(r?.basis_portionen, 1);

  // Tags
  const eigIds = normalizeArray(r?.tags?.eigenschaften);
  const loreIds = normalizeArray(r?.tags?.lore);

  const erlaubteGruppen = [
    "Ernährung",
    "Allergen (enthält)",
    "Speise",
    "Verwendung",
  ];
  const eigGruppiert = groupEigenschaften(eigIds, ctx.eigById, erlaubteGruppen);

  // Geschichte
  const gesch = r?.inhalt?.geschichte || {};
  const kurz = String(gesch?.kurz || "");
  const setting = String(gesch?.setting || "");
  const ritual = Array.isArray(gesch?.ritual) ? gesch.ritual.map(String) : [];

  // Zutatenlisten
  const zutatenlisten = Array.isArray(r?.inhalt?.zutatenlisten)
    ? r.inhalt.zutatenlisten
    : [];

  // Schritte
  const schritteGruppen = Array.isArray(r?.inhalt?.schritte)
    ? r.inhalt.schritte
    : [];

  // Gruppen -> flache Step-Liste (mit Gruppenname als Zusatz)
  const schritte = schritteGruppen.flatMap((g) => {
    const gruppenName = String(g?.name || g?.titel || g?.typ || "").trim();
    const steps = Array.isArray(g?.schritte) ? g.schritte : [];
    return steps.map((s) => ({
      ...s,
      __gruppe: gruppenName,
    }));
  });

  // Einkaufsliste
  const einkaufsliste = Array.isArray(r?.einkaufsliste) ? r.einkaufsliste : [];

  // UI state: portionen
  let currentPortionen = basisPortionen;

  root.innerHTML = `
    <div class="rezept-page">
    <header class="topbar">
      <div class="topbar-left">
        <a class="btn-back" href="./startseite.html">← Zurück</a>
      </div>
      
      <h1 class="rezept-h1">${escapeHtml(titel)}</h1>

      <div class="topbar-right">
        <button id="themeToggle" class="btn-theme" type="button" aria-label="Theme umschalten">🌙</button>
      </div>
    </header>

    <div class="page">
  <!-- 6er Raster: 2/6 | 1/6 | 1/6  -->
  <main class="grid6">
    <!-- LINKS: 2/6 (= 1/3) -->
    <section class="left">
      <!-- oben 1/3: Bild + Eigenschaften -->
      <div class="left__top">
        <div class="card image" id="imageBox">
          ${
            bildPfad
              ? `<img id="recipeImage" class="rezept-hero__img" src="${escapeHtml(bildPfad)}" alt="${escapeHtml(titel)}">`
              : `<div id="recipeImage" class="rezept-hero__img rezept-hero__img--empty">Kein Bild</div>`
          }
        </div>

        <div class="card props" id="propsBox">
          <h2>Eigenschaften</h2>

          <div class="rezept-tags">
            ${renderEigenschaftenBlocks(eigGruppiert, erlaubteGruppen)}
            ${renderLoreLine(loreIds, ctx.loreById)}
          </div>
        </div>
      </div>

      <!-- unten 2/3: Anleitung -->
      <div class="card instructions" id="instructionsBox">
        <h2>Anleitung</h2>

        <div class="steps">
          ${renderSteps(schritte)}
        </div>
      </div>
    </section>

    <!-- MITTE: 1/6 Zutatenbereich (oben Zutatenliste, unten Einkaufsliste) -->
    <section class="mid">
      <div class="card ingredients" id="ingredientsBox">
        <div class="headRow">
          <h2>Zutaten</h2>

          <div class="portionen">
            <span class="portionen__label">P:</span>

            <div class="portionen__inputWrapper">
              <input
                class="portionen__input"
                id="portionenInput"
                type="number"
                min="1"
                step="1"
                value="${escapeHtml(String(basisPortionen))}"
              />

              <div class="portionen__stepper">
                <button class="portionen__btn" data-portions="+1" type="button">+</button>
                <button class="portionen__btn" data-portions="-1" type="button">−</button>
              </div>
            </div>

            <button class="portionen__cart" id="shoppingToList" type="button" title="Zur Einkaufsliste">🛒</button>
          </div>
        </div>

        <div id="zutatenBlock"></div>
      </div>

      <div class="card shopping" id="shoppingBox">
        <div class="headRow">
          <h2>Einkaufsliste</h2>
          <button id="shoppingClear" class="btn-small" type="button">Alle abwählen</button>
        </div>

        <div class="shopping" id="shoppingBlock"></div>
      </div>
    </section>

    <!-- RECHTS: 1/6 Lore -->
    <aside class="card lore" id="loreBox">
      <h2>Geschichte</h2>

      <div class="story">
        ${kurz ? `<p class="story__kurz">${escapeHtml(kurz)}</p>` : ""}
        ${setting ? `<p class="story__setting"><strong>Setting:</strong> ${escapeHtml(setting)}</p>` : ""}
        ${
          ritual.length
            ? `<div class="story__ritual">
                 <div class="story__ritualTitle">Ritual</div>
                 <ul>${ritual.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
               </div>`
            : ""
        }
      </div>
    </aside>
  </main>
</div>
  `;

  // Theme toggle button neu binden (weil wir header neu gerendert haben)
  initThemeToggle();

  // Render Zutaten initial
  const zutatenBlock = root.querySelector("#zutatenBlock");
  const portionenInput = root.querySelector("#portionenInput");

  const bindZutatenInfoButtons = () => {
    root.querySelectorAll(".zut-info").forEach((btn) => {
      if (btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const zid = String(btn.dataset.zid || "");
        const z = ctx.zutatById.get(zid);
        if (!z) return;

        openIngredientInfo(z);
      });
    });
  };

  const drawZutaten = () => {
    const factor = currentPortionen / basisPortionen;
    zutatenBlock.innerHTML = renderZutatenlisten(
      zutatenlisten,
      factor,
      ctx.zutatById,
    );

    // nach jedem Render wieder binden
    bindZutatenInfoButtons();
  };

  drawZutaten();

  // Portionen Events
  root.querySelectorAll(".portionen__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.portions;
      const next = mode === "+1" ? currentPortionen + 1 : currentPortionen - 1;
      currentPortionen = Math.max(1, next);
      portionenInput.value = String(currentPortionen);
      drawZutaten();
    });
  });

  portionenInput.addEventListener("input", () => {
    const n = Math.max(
      1,
      Math.round(toNumberOr(portionenInput.value, basisPortionen)),
    );
    currentPortionen = n;
    portionenInput.value = String(n);
    drawZutaten();
  });

  // Einkaufsliste
  const shoppingBlock = root.querySelector("#shoppingBlock");
  shoppingBlock.innerHTML = renderShopping(einkaufsliste, ctx.zutatById);

  const shoppingClear = root.querySelector("#shoppingClear");
  shoppingClear.addEventListener("click", () => {
    shoppingBlock.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
    });
  });
}

/* ============================================================
   Render helpers
============================================================ */

function renderEigenschaftenBlocks(gruppiert, erlaubteGruppen) {
  return erlaubteGruppen
    .map((g) => {
      const list = gruppiert[g] || [];
      if (!list.length) return "";
      const chips = list
        .map(
          (e) =>
            `<span class="tag-chip">${escapeHtml(e.icon || "")} ${escapeHtml(e.label || e.id)}</span>`,
        )
        .join("");
      return `
        <div class="prop-group">
          <div class="prop-group-title">${escapeHtml(g)}</div>
          <div class="prop-items">${chips}</div>
        </div>
      `;
    })
    .join("");
}

function renderLoreLine(loreIds, loreById) {
  if (!loreIds.length) return "";
  const txt = loreIds.map((id) => loreById.get(id)?.label || id).join(", ");
  return `<div class="rezept-lore">${escapeHtml(txt)}</div>`;
}

function renderZutatenlisten(zutatenlisten, factor, zutatById) {
  if (!zutatenlisten.length)
    return `<div class="muted">Keine Zutatenliste vorhanden.</div>`;

  return zutatenlisten
    .map((zl) => {
      const titel = String(zl?.titel || "Zutaten");
      const posten = Array.isArray(zl?.posten) ? zl.posten : [];

      const li = posten
        .map((p) => {
          const zId = String(p?.zutat_id || "");
          const zName = zutatById.get(zId)?.name || zId || "Unbekannt";

          const menge = p?.menge;
          const einheit = String(p?.einheit || "");
          const prep = String(p?.prep || "");

          const scaled = scaleAmount(menge, factor);
          const left = [scaled, einheit].filter(Boolean).join(" ").trim();

          const right = [zName, prep ? `(${prep})` : ""]
            .filter(Boolean)
            .join(" ");

          return `
            <li class="zut-row">
              <button class="zut-info" type="button" data-zid="${escapeHtml(zId)}" aria-label="Info zu ${escapeHtml(zName)}">ℹ️</button>
              <span class="zut-right">${escapeHtml(right)}</span>
              <span class="zut-name">${escapeHtml(left)}</span>
            </li>
`;
        })
        .join("");

      return `
        <div class="zut-block">
          <div class="zut-title">${escapeHtml(titel)}</div>
          <ul class="zut-list">${li || ""}</ul>
        </div>
      `;
    })
    .join("");
}

function renderShopping(einkaufsliste, zutatById) {
  if (!einkaufsliste.length)
    return `<div class="muted">Keine Einkaufsliste vorhanden.</div>`;

  return einkaufsliste
    .map((g, gi) => {
      const gName = String(g?.gruppe || "Einkauf");
      const items = Array.isArray(g?.items) ? g.items : [];

      const rows = items
        .map((it, ii) => {
          const zId = String(it?.zutat_id || "");
          const zName = zutatById.get(zId)?.name || zId || "Unbekannt";
          const menge = it?.menge;
          const einheit = String(it?.einheit || "");
          const notizen = Array.isArray(it?.notizen)
            ? it.notizen.map(String)
            : [];

          const left = [menge != null ? String(menge) : "", einheit]
            .filter(Boolean)
            .join(" ")
            .trim();
          const noteTxt = notizen.length ? ` – ${notizen.join(", ")}` : "";

          const cid = `shop_${gi}_${ii}`;
          return `
            <label class="shop-row">
              <input type="checkbox" id="${escapeHtml(cid)}">
              <span class="shop-text">
                <span class="shop-main">${escapeHtml(left ? left + " " : "")}${escapeHtml(zName)}</span>
                ${noteTxt ? `<span class="shop-note">${escapeHtml(noteTxt)}</span>` : ""}
              </span>
            </label>
          `;
        })
        .join("");

      return `
        <div class="shop-group">
          <div class="shop-group-title">${escapeHtml(gName)}</div>
          <div class="shop-group-body">${rows}</div>
        </div>
      `;
    })
    .join("");
}

function renderSteps(schritte) {
  if (!schritte.length)
    return `<div class="muted">Keine Anleitung vorhanden.</div>`;

  let lastGroup = "";

  return schritte
    .map((s) => {
      const group = String(s.__gruppe || "").trim();
      const nr = s?.nr != null ? String(s.nr) : "";
      const titel = String(s?.titel || "");
      const zeit = toNumberOr(s?.zeit_min, 0);

      const textLines = Array.isArray(s?.text)
        ? s.text.map(String)
        : s?.text
          ? [String(s.text)]
          : [];

      const kontrollen = Array.isArray(s?.kontrolle)
        ? s.kontrolle.map(String)
        : [];

      const hinweis = s?.hinweis ? String(s.hinweis) : "";

      const showGroupHeader = group && group !== lastGroup;
      lastGroup = group;

      return `
        ${showGroupHeader ? `<div class="step-group">${escapeHtml(group)}</div>` : ""}

        <div class="step-card">
          <div class="step-header">
            <div class="step-nr">${escapeHtml(nr ? nr + "." : "")}</div>
            <div class="step-title">${escapeHtml(titel)}</div>
            ${zeit ? `<div class="step-time">${escapeHtml(String(zeit))} min</div>` : ""}
          </div>

          ${
            textLines.length
              ? `<ul class="step-text">
                  ${textLines.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}
                </ul>`
              : ""
          }

          ${
            kontrollen.length
              ? `<div class="step-check">
                  <strong>Kontrolle:</strong>
                  <ul>
                    ${kontrollen.map((k) => `<li>${escapeHtml(k)}</li>`).join("")}
                  </ul>
                </div>`
              : ""
          }

          ${
            hinweis
              ? `<div class="step-hint">
                  💡 ${escapeHtml(hinweis)}
                </div>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

/* ============================================================
   Utilities
============================================================ */

function ensureRoot() {
  // Falls dein rezept.html keinen Container hat, bauen wir ihn automatisch.
  let root = document.getElementById("rezeptRoot");
  if (!root) {
    root = document.createElement("main");
    root.id = "rezeptRoot";
    document.body.appendChild(root);
  }
  return root;
}

function getQueryParam(key) {
  const url = new URL(window.location.href);
  return url.searchParams.get(key);
}

async function loadJson(url, key) {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Konnte ${url} nicht laden (HTTP ${res.status})`);
  const data = await res.json();
  const arr = data?.[key];
  return Array.isArray(arr) ? arr : [];
}

function normalizeArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string")
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

function groupEigenschaften(ids, eigById, erlaubteGruppen) {
  const out = {};
  erlaubteGruppen.forEach((g) => (out[g] = []));

  ids.forEach((id) => {
    const e = eigById.get(String(id));
    if (!e) return;
    if (!erlaubteGruppen.includes(String(e.gruppe))) return;
    out[String(e.gruppe)].push(e);
  });

  // stabil sortieren: prioritaet, dann label
  erlaubteGruppen.forEach((g) => {
    out[g].sort((a, b) => {
      const pa = toNumberOr(a?.prioritaet, 9999);
      const pb = toNumberOr(b?.prioritaet, 9999);
      if (pa !== pb) return pa - pb;
      return String(a?.label || "").localeCompare(String(b?.label || ""), "de");
    });
  });

  return out;
}

function scaleAmount(menge, factor) {
  if (menge == null || menge === "") return "";
  const n = Number(menge);
  if (!Number.isFinite(n)) return String(menge); // falls "nach Geschmack" etc.
  const v = n * factor;
  return formatNumber(v);
}

function formatNumber(v) {
  // schön: 1, 1.5, 0.25, 2.33 (max 2 Dezimalen, ohne trailing zeros)
  const rounded = Math.round(v * 100) / 100;
  const s = String(rounded);
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, ""); // 2.00 -> 2, 2.50 -> 2.5
}

function toNumberOr(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function renderFatalError(title, msg) {
  const root = ensureRoot();
  root.innerHTML = `
    <div class="rezept-page">
      <header class="rezept-topbar">
        <a class="rezept-back" href="./startseite.html">← Zurück</a>
        <button id="themeToggle" class="rezept-theme" type="button">🌙</button>
      </header>

      <div class="fatal">
        <h1 class="rezept-h1">${escapeHtml(title)}</h1>
        <p class="fatal__msg">${escapeHtml(msg)}</p>
      </div>
    </div>
  `;
  initThemeToggle();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ============================================================
   Theme toggle (wie bei dir, aber robust)
============================================================ */
function openIngredientInfo(z) {
  const name = String(z?.name || "Zutat");

  const imgPath = z?.bilder?.pfad ? String(z.bilder.pfad) : "";
  const imgAlt = z?.bilder?.alt ? String(z.bilder.alt) : name;

  const lagerOrt = z?.lagerung?.ort ? String(z.lagerung.ort) : "";
  const halt = Number.isFinite(z?.lagerung?.haltbarkeit_tage)
    ? `${z.lagerung.haltbarkeit_tage} Tage`
    : "";
  const tipps = Array.isArray(z?.lagerung?.tipps) ? z.lagerung.tipps.map(String) : [];
  const schlecht = Array.isArray(z?.schlecht_erkennen) ? z.schlecht_erkennen.map(String) : [];

  const saisonMonate = Array.isArray(z?.saison?.schweiz_monate) ? z.saison.schweiz_monate : [];
  const saisonLabels = Array.isArray(z?.saison?.alternativ_labels) ? z.saison.alternativ_labels.map(String) : [];

  const kcal = z?.naehrwerte_pro_100g?.kcal ?? "";
  const protein = z?.naehrwerte_pro_100g?.protein_g ?? "";
  const fett = z?.naehrwerte_pro_100g?.fett_g ?? "";
  const kh = z?.naehrwerte_pro_100g?.kh_g ?? "";

  const saisonTxt =
    saisonLabels.length
      ? saisonLabels.join(", ")
      : (saisonMonate.length ? `Monate: ${saisonMonate.join(", ")}` : "Ganzjährig");

  const html = `
    <div class="zinfo">
      ${imgPath ? `<img class="zinfo__img" src="${escapeHtml(imgPath)}" alt="${escapeHtml(imgAlt)}">` : ""}

      <div class="zinfo__body">
        <div class="zinfo__title">${escapeHtml(name)}</div>

        ${lagerOrt || halt || tipps.length ? `
          <div class="zinfo__sec">Lagerung</div>
          <div class="zinfo__txt">${escapeHtml(lagerOrt)}${halt ? ` • ${escapeHtml(halt)}` : ""}</div>
          ${tipps.length ? `<ul class="zinfo__list">${tipps.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : ""}
        ` : ""}

        <div class="zinfo__sec">Saison (CH)</div>
        <div class="zinfo__txt">${escapeHtml(saisonTxt)}</div>

        ${schlecht.length ? `
          <div class="zinfo__sec">Schlecht erkennen</div>
          <ul class="zinfo__list">${schlecht.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
        ` : ""}

        <div class="zinfo__sec">Nährwerte / 100g</div>
        <div class="zinfo__txt">Kcal: ${escapeHtml(kcal)} • Protein: ${escapeHtml(protein)}g • Fett: ${escapeHtml(fett)}g • KH: ${escapeHtml(kh)}g</div>
      </div>
    </div>
  `;

  let dlg = document.getElementById("ingredientDialog");
  if (!dlg) {
    dlg = document.createElement("dialog");
    dlg.id = "ingredientDialog";
    dlg.innerHTML = `
      <form method="dialog" class="zdlg">
        <div id="ingredientDialogBody"></div>
        <div class="zdlg__foot">
          <button type="submit">Schliessen</button>
        </div>
      </form>
    `;
    document.body.appendChild(dlg);
  }

  dlg.querySelector("#ingredientDialogBody").innerHTML = html;
  dlg.showModal();
}


function initThemeToggle() {
  const STORAGE_KEY = "theme";
  const toggle = document.getElementById("themeToggle");

  function applyThemeFromStorage() {
    const v = localStorage.getItem(STORAGE_KEY);
    const theme = v === "dark" ? "dark" : "light";

    document.body.classList.toggle("dark", theme === "dark");

    if (toggle) {
      toggle.textContent = theme === "dark" ? "☀️" : "🌙";
    }
  }

  // Beim Laden immer anwenden
  applyThemeFromStorage();

  if (!toggle) return;

  // Doppelbindung verhindern (wichtig bei deinem Re-Render!)
  if (toggle.dataset.bound === "1") return;
  toggle.dataset.bound = "1";

  toggle.addEventListener("click", () => {
    const current = localStorage.getItem(STORAGE_KEY);
    const next = current === "dark" ? "light" : "dark";

    // 1️⃣ Nur LocalStorage ändern
    localStorage.setItem(STORAGE_KEY, next);

    // 2️⃣ Direkt im aktuellen Tab anwenden
    applyThemeFromStorage();
  });

  // 3️⃣ Wenn anderer Tab den Wert ändert → hier übernehmen
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      applyThemeFromStorage();
    }
  });
}
