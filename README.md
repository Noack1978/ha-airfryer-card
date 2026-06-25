# ha-airfryer-card

Lovelace-Karte für Home Assistant zur Steuerung und Verwaltung von
Airfryer-Rezepten.

## Funktionen

- **Manuelle Steuerung**: Temperatur, Kochzeit, Stromversorgung, Start/Pause/Stopp
- **Warmhalten & Einstellungen**: Vorheizen, Warmhalten, Warmhaltetemperatur, Warmhaltedauer, Kochmethode
- **Rezepte**: Alle Skripte mit konfiguriertem Label werden automatisch als Buttons angezeigt
- **Responsives Layout**: Ab 480px Kartenbreite werden Steuerung (links) und Warmhalten (rechts) nebeneinander angezeigt; Rezepte immer auf voller Breite darunter
- **Automatische Aktualisierung**: Neue Skripte erscheinen sofort ohne Seitenreload
- **+ Button**: Öffnet direkt die Blueprint-Übersicht zum Anlegen neuer Rezepte
- **Visueller Editor**: Alle Entitäten und Einstellungen per Dropdown konfigurierbar; nicht gewählte Elemente werden ausgeblendet

## Installation (HACS)

1. HACS → Frontend → ⋮ → Benutzerdefinierte Repositories →
   `https://github.com/Noack1978/ha-airfryer-card` hinzufügen
   (Kategorie: Lovelace).
2. "Airfryer Rezepte Card" installieren.
3. Ressource hinzufügen: Einstellungen → Dashboards → ⋮ → Ressourcen →
   URL `/hacsfiles/ha-airfryer-card/ha-airfryer-card.js`,
   Typ **JavaScript-Modul**.
4. Browser-Cache leeren.

## Verwendung

Karte über Dashboard-Editor hinzufügen → "Benutzerdefinierte Karten" →
**"Airfryer Rezepte"** – oder manuell per YAML:

```yaml
type: custom:ha-airfryer-card
title: Airfryer Rezepte
label: airfryer
columns: 3
icon_size: 28
font_size: 0.75
# Manuelle Steuerung (linke Spalte)
entity_power: switch.airfryer_hd9280_stromversorgung
entity_temp: number.airfryer_hd9280_temperatur_einstellen
entity_time: number.airfryer_hd9280_kochzeit_einstellen
entity_start: button.airfryer_hd9280_kochen_starten
entity_pause: button.airfryer_hd9280_pause
entity_stop: button.airfryer_hd9280_stopp
# Warmhalten & Einstellungen (rechte Spalte)
entity_preheat: switch.airfryer_hd9280_vorheizen
entity_keep_warm: button.airfryer_hd9280_warmhalten
entity_warm_temp: number.airfryer_hd9280_warmhaltetemperatur
entity_warm_time: number.airfryer_hd9280_warmhaltedauer
entity_cook_method: select.airfryer_hd9280_kochmethode
```

Alle `entity_*`-Felder sind optional – nicht konfigurierte Elemente werden
ausgeblendet.

### Optionen

| Option | Standard | Beschreibung |
|---|---|---|
| `label` | `airfryer` | Label der anzuzeigenden Skripte (Groß-/Kleinschreibung egal) |
| `columns` | `3` | Anzahl Spalten im Rezept-Grid |
| `title` | _(leer)_ | Titel oben links in der Karte |
| `icon_size` | `28` | Icon-Größe der Rezept-Buttons in px |
| `font_size` | `0.75` | Schriftgröße der Rezept-Buttons in em |
| `blueprint_path` | `/config/blueprint/dashboard` | Pfad für den +-Button |
| `entity_power` | – | Stromversorgung (`switch`) |
| `entity_temp` | – | Temperatur (`number`) |
| `entity_time` | – | Kochzeit (`number`) |
| `entity_start` | – | Kochen starten (`button`) |
| `entity_pause` | – | Pause (`button`) |
| `entity_stop` | – | Stopp (`button`) |
| `entity_preheat` | – | Vorheizen (`switch`) |
| `entity_keep_warm` | – | Warmhalten (`button`) |
| `entity_warm_temp` | – | Warmhaltetemperatur (`number`) |
| `entity_warm_time` | – | Warmhaltedauer (`number`) |
| `entity_cook_method` | – | Kochmethode (`select`) |

## Rezepte anlegen

1. Auf **+** in der Karte tippen → Blueprint-Übersicht öffnet sich.
2. Bei **"Airfryer Einstellung starten"** (aus dem Repo
   [ha-airfryer-presets](https://github.com/Noack1978/ha-airfryer-presets))
   auf "Skript erstellen" tippen.
3. Name, Temperatur, Kochzeit einstellen, Label **`airfryer`** zuweisen,
   Icon setzen → Speichern.
4. Das neue Preset erscheint **automatisch** in der Karte.

## Versionierung

| Version | Änderung |
|---|---|
| v1.0.0 | Erste Version: Rezepte mit automatischer Aktualisierung, +-Button, visueller Editor |
| v1.1.0 | Manuelle Steuerung (Temperatur, Zeit, Start/Pause/Stopp, Stromversorgung) |
| v1.2.0 | Warmhalten & Einstellungen (Vorheizen, Warmhaltetemperatur, Warmhaltedauer, Kochmethode) |
| v1.3.0 | Responsives zwei-Spalten-Layout (ab 480px Kartenbreite); alle Entitäten einzeln im Editor wählbar; nicht gewählte Elemente ausgeblendet |

---

GitHub: [Noack1978](https://github.com/Noack1978)
