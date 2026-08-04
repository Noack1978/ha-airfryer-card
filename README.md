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
  Warmhaltedauer, Kochmethode, Meine Voreinstellungen, Rezepte aktualisieren
- **Dropdowns**: Kochmethode und Voreinstellungen als natives Shadow-DOM-Dropdown
  (kein Überlappen mit anderen Elementen)
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
entity_presets: select.airfryer_hd9280_meine_voreinstellungen
entity_update: button.airfryer_hd9280_rezepte_aktualisieren
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
| `temp_steps` | `[5, 10]` | Schrittgrößen für Temperatur-Buttons |
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
| `entity_remaining` | – | Restlaufzeit in Sekunden (`sensor` oder `number`), wird als MM:SS angezeigt |
| `entity_presets` | – | Meine Voreinstellungen (`select`) |
| `entity_update` | – | Rezepte aktualisieren (`button`) |

## Rezepte direkt speichern

Über den Button **"Als Rezept speichern"** in der manuellen Steuerung können aktuelle Temperatur und Kochzeit direkt als neues Rezept-Skript gespeichert werden – ohne den Blueprint-Editor öffnen zu müssen.

Ein Tippen auf den Button öffnet ein Formular direkt in der Karte:
1. Aktuelle Temperatur und Kochzeit werden angezeigt
2. **Name** für das Rezept eingeben
3. **Icon** aus 10 Vorschlägen auswählen
4. Auf **"Speichern"** tippen

Das Rezept erscheint danach automatisch in der Karte. Das Formular schließt sich sobald das neue Rezept sichtbar ist.

> **Hinweis:** Die Speicherfunktion erfordert **Admin-Rechte** in Home Assistant, da sie Konfigurationsdateien schreibt (`/api/config/script/config/`). Nutzer ohne Admin-Rechte (z.B. ein Tablet-Kiosk-Account) erhalten beim Speichern einen Fehler. In diesem Fall müssen Rezepte über einen Admin-Account angelegt werden.

## Versionierung

| Version | Änderung |
|---|---|
| v1.0.0 | Erste Version: Rezepte mit automatischer Aktualisierung, +-Button, visueller Editor |
| v1.1.0 | Manuelle Steuerung (Temperatur, Zeit, Start/Pause/Stopp, Stromversorgung) |
| v1.2.0 | Warmhalten & Einstellungen (Vorheizen, Warmhaltetemperatur, Warmhaltedauer, Kochmethode) |
| v1.3.0 | Responsives zwei-Spalten-Layout (ab 480px Kartenbreite) |
| v1.4.0 | Slider ersetzt durch +/− Buttons mit konfigurierbaren Schrittgrößen und Schnellwahl-Buttons |
| v1.5.0 | Dropdown-Bug behoben (Body-Overlay); Meine Voreinstellungen und Rezepte aktualisieren hinzugefügt |
| v1.6.0 | Restlaufzeit-Anzeige (MM:SS) hinzugefügt; Dropdown-Menü über allen Karten |

---

GitHub: [Noack1978](https://github.com/Noack1978)
