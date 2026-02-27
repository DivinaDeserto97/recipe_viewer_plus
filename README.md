# REZEPT_VIEWER_PLUS

## 🎯 Ziel des Projekts

REZEPT_VIEWER_PLUS ist ein modular aufgebauter, lokal laufender
Rezept-Viewer mit folgenden Zielen:

-   Strukturierte Verwaltung von Rezepten
-   Trennung von Rezepten, Zutaten, Eigenschaften und Lore
-   Dynamische Filter (Vegetarisch, Vegan, Saison, Zutaten, Lore usw.)
-   Portionen-Skalierung
-   Zutaten-Detailansicht mit Lagerung, Haltbarkeit, Saison & Nährwerten
-   Varianten pro Rezept (klappbar)
-   Saubere Dark/Light-Theme-Unterstützung
-   Erweiterbar für große Rezeptdatenbanken

Das System ist bewusst ohne Framework gebaut (reines HTML, CSS,
JavaScript).

------------------------------------------------------------------------

## 📂 Projektstruktur

    RECIPE_VIEWER_PLUS/
    │
    ├── startseite.html
    ├── rezept.html
    │
    ├── css/
    │   ├── variablen.css
    │   ├── grundlayout.css
    │   ├── komponenten.css
    │   ├── hell.css
    │   └── dunkel.css
    │
    ├── js/
    │   └── app.js
    │
    ├── daten/
    │   ├── rezepte.json
    │   ├── zutaten.json
    │   ├── eigenschaften.json
    │   ├── lore.json
    │   ├── kategorien.json
    │   ├── saison.json
    │   └── einheiten.json
    │
    └── img/
        ├── rezepte/
        └── zutaten/

------------------------------------------------------------------------

## 📄 Erklärung der Dateien

### HTML

**startseite.html** - Listet alle Rezepte - Enthält Suche und Filter -
Zeigt alphabetische oder gefilterte Ansicht

**rezept.html** - Detailansicht eines einzelnen Rezepts - Struktur
1--5: 1. Zutatenliste (mit Portionen & Varianten) 2. Geschichte (Lore)
3. Einkaufsliste 4. Anleitung 5. Bild - Unter Anleitung: Haltbarkeit,
Lagerung, Nährwerte, Allergene

------------------------------------------------------------------------

### CSS

**variablen.css** - Zentrale Farb- und Design-Variablen

**grundlayout.css** - Grid-Layout, Struktur, Responsiveness

**komponenten.css** - Buttons, Cards, Badges, Dropdowns, Tooltip etc.

**hell.css** - Light Theme

**dunkel.css** - Dark Theme

------------------------------------------------------------------------

### JavaScript

**app.js** - Lädt JSON-Daten - Baut Filter dynamisch - Berechnet
Portionen - Verknüpft Zutaten mit Detailinformationen - Steuert
Dark/Light-Modus - Handhabt Navigation zwischen Liste und Detail

------------------------------------------------------------------------

### daten/

**rezepte.json** - Hauptdatenbank aller Rezepte - Zutatenreferenzen
(IDs) - Varianten - Schritte - Lagerung - Nährwerte - Einkaufsliste

**zutaten.json** - Zentrale Zutaten-Datenbank - Bild - Lagerung -
Saison - Haltbarkeit - Nährwerte - Allergene

**eigenschaften.json** - Filter wie Vegetarisch, Vegan, Glutenfrei,
Meal-Prep usw.

**lore.json** - Rassen, Kulturen, Länder, Preis-Kategorien

**kategorien.json** - Gerichtart, Saison-Gefühl, Effekte (Sommer, Salat,
Dessert etc.)

**saison.json** - Saison-Definitionen (Monate → Frühling, Sommer usw.)

**einheiten.json** - Einheiten wie g, ml, TL, EL, Stück

------------------------------------------------------------------------

## 🛠 Verwendete Technologien

-   HTML5
-   CSS3 (Grid & Flexbox)
-   Vanilla JavaScript (ES6+)
-   JSON als Datenstruktur
-   Kein Framework
-   Keine externe Abhängigkeit
-   Läuft komplett lokal im Browser

------------------------------------------------------------------------

## 🚀 Erweiterungsmöglichkeiten

-   Mehrsprachigkeit
-   Favoriten-System
-   Lokale Speicherung (LocalStorage)
-   Druckansicht
-   Export als PDF
-   Automatische Allergen-Berechnung
-   Automatische Nährwertberechnung
-   REST-Backend Anbindung
-   Progressive Web App (Offline-Modus)

------------------------------------------------------------------------

## 📌 Architekturprinzip

Strikte Trennung von:

-   Anzeige (HTML)
-   Design (CSS)
-   Logik (JS)
-   Daten (JSON)

Dadurch bleibt das System: - Wartbar - Erweiterbar - Skalierbar -
Übersichtlich

------------------------------------------------------------------------

------------------------------------------------------------------------

## 📌 To do

### 0. 🔎 Einfache Suche

- [ ] Suche nach Rezeptname
- [ ] Suche nach Teilwort (z.B. "Gurken")
- [ ] Suche nach Zutaten
- [ ] Suche nach Tags
- [ ] Kombinierbar mit anderen Filtern

--------------------------------------------------

### 1. 👥 Eigenschaften

- [x] Allergen (enthält)
- [x] Ernährung
- [x] Verwendung

--------------------------------------------------

### 2. 🧙 DnD-Filter (Lore & Setting)

- [x] Preis
- [x] Rasse
- [x] Küche

--------------------------------------------------

### 3. 🧺 Zutaten-Filter (Was habe ich zuhause?)

- [ ] Mehrere Zutaten auswählbar
- [ ] Wen alergien Ausgeschaltet zutaten augegraut

--------------------------------------------------

## 4. 🌱 Saison-Filter (Was ist gerade sinnvoll?)

- [x] Nach Monat filtern
- [x] Nach Jahreszeit filtern

--------------------------------------------------

### 5. 🧪 Nährstoff-Filter (Mangel ausgleichen)

- [ ] Nach Nährstoff filtern (Eisen, B12, Protein ...)
- [ ] Rezepte nach Nährstoffmenge sortieren
- [ ] Mindestwert definierbar
- [ ] Kombination mehrerer Nährstoffe möglich
- [ ] "Nährstoffreichste Rezepte" anzeigen

--------------------------------------------------



© REZEPT_VIEWER_PLUS
