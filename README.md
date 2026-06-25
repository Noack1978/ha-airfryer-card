# ha-airfryer-card

Lovelace-Karte für Home Assistant, die alle Airfryer-Rezepte (Skripte mit
einem konfigurierbaren Label) automatisch als Buttons anzeigt.

- Aktualisiert sich automatisch wenn neue Skripte hinzukommen – kein
  manuelles Neuladen nötig
- **+**-Button in der Kartenecke öffnet direkt die Blueprint-Übersicht
  zum Anlegen neuer Presets
- Icon und Name werden direkt aus dem Skript übernommen
- Anzahl Spalten, Titel und Label sind konfigurierbar

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
```

### Optionen

| Option | Standard | Beschreibung |
|---|---|---|
| `label` | `airfryer` | Label der anzuzeigenden Skripte |
| `columns` | `3` | Anzahl Spalten im Grid |
| `title` | _(leer)_ | Titel oben links in der Karte |
| `blueprint_path` | `/config/blueprint/dashboard` | Pfad für den +-Button |

## Skripte anlegen

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
| v1.0.0 | Erste Version |

---

GitHub: [Noack1978](https://github.com/Noack1978)
