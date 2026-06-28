# ha-airfryer-card

Lovelace-Karte für Home Assistant zur Steuerung und Verwaltung von
Airfryer-Rezepten.

## Voraussetzungen

Diese Karte funktioniert am besten zusammen mit dem Blueprint-Repo
[ha-airfryer-presets](https://github.com/Noack1978/ha-airfryer-presets),
das das Skript-Blueprint "Airfryer Einstellung starten" bereitstellt.
Damit lassen sich Rezepte (Temperatur + Kochzeit) als wiederverwendbare
Skripte anlegen, die dann automatisch in dieser Karte erscheinen.

## Funktionen

- **Manuelle Steuerung**: Temperatur und Kochzeit per +/− Buttons mit
  konfigurierbaren Schrittgrößen und Schnellwahl-Buttons für feste Werte
- **Aktions-Buttons**: Start, Pause, Stopp (farbig hervorgehoben)
- **Stromversorgung**: Toggle-Schalter
- **Warmhalten & Einstellungen**: Vorheizen, Warmhalten, Warmhaltetemperatur,
  Warmhaltedauer, Kochmethode – alle optional
- **Rezepte**: Alle Skripte mit konfiguriertem Label werden automatisch
  als Buttons angezeigt
- **Responsives Layout**: Ab 480px Kartenbreite werden Steuerung (links)
  und Warmhalten (rechts) nebeneinander angezeigt; Rezepte immer auf
  voller Breite darunter
- **Automatische Aktualisierung**: Neue Skripte erscheinen sofort ohne
  Seitenreload
- **+ Button**: Öffnet direkt die Blueprint-Übersicht zum Anlegen neuer
  Rezepte
- **Visueller Editor**: Alle Entitäten, Schrittgrößen und Schnellwahl-Werte
  konfigurierbar; nicht gewählte Elemente werden ausgeblendet

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
# Schritte und Schnellwahl
temp_steps: [5, 10]
temp_presets: [180, 190, 200]
time_steps: [1, 5]
time_presets: [10, 15, 20]
warm_temp_steps: [5]
warm_time_steps: [1, 5]
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
| `temp_steps` | `[5, 10]` | Schrittgrößen für Temperatur-Buttons (kommagetrennt) |
| `temp_presets` | `[]` | Schnellwahl-Werte für Temperatur, z.B. `[180, 190, 200]` |
| `time_steps` | `[1, 5]` | Schrittgrößen für Kochzeit-Buttons |
| `time_presets` | `[]` | Schnellwahl-Werte für Kochzeit in Minuten |
| `warm_temp_steps` | `[5]` | Schrittgrößen für Warmhaltetemperatur |
| `warm_time_steps` | `[1, 5]` | Schrittgrößen für Warmhaltedauer |
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

### Temperatur- und Zeit-Steuerung

Für Temperatur und Kochzeit werden +/− Buttons generiert:

```
🌡 180 °C
[−10] [−5] [+5] [+10]
[180°C] [190°C] [200°C]   ← Schnellwahl (optional)
```

Die Schrittgrößen (`temp_steps`) und Schnellwahl-Werte (`temp_presets`)
sind frei konfigurierbar – sowohl im visuellen Editor (kommagetrennte
Eingabe) als auch per YAML (Liste).

## Rezepte anlegen

1. Auf **+** in der Karte tippen → Blueprint-Übersicht öffnet sich.
2. Bei **"Airfryer Einstellung starten"** auf "Skript erstellen" tippen.
3. Name, Temperatur, Kochzeit einstellen, Label **`airfryer`** zuweisen,
   Icon setzen → Speichern.
4. Das neue Preset erscheint **automatisch** in der Karte.

## Versionierung

| Version | Änderung |
|---|---|
| v1.0.0 | Erste Version: Rezepte mit automatischer Aktualisierung, +-Button, visueller Editor |
| v1.1.0 | Manuelle Steuerung (Temperatur, Zeit, Start/Pause/Stopp, Stromversorgung) |
| v1.2.0 | Warmhalten & Einstellungen (Vorheizen, Warmhaltetemperatur, Warmhaltedauer, Kochmethode) |
| v1.3.0 | Responsives zwei-Spalten-Layout (ab 480px Kartenbreite) |
| v1.4.0 | Slider ersetzt durch +/− Buttons mit konfigurierbaren Schrittgrößen und Schnellwahl-Buttons |

---

GitHub: [Noack1978](https://github.com/Noack1978)
