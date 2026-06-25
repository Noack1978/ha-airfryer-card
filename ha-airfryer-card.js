/**
 * ha-airfryer-card
 * Lovelace-Karte für Airfryer-Rezepte.
 */

const DEFAULT_LABEL = "airfryer";
const DEFAULT_BLUEPRINT_PATH = "/config/blueprint/dashboard";

class HaAiryerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = {};
    this._scripts = [];
    this._initialized = false;
  }

  setConfig(config) {
    this._config = {
      label: config.label || DEFAULT_LABEL,
      columns: config.columns || 3,
      blueprint_path: config.blueprint_path || DEFAULT_BLUEPRINT_PATH,
      title: config.title || null,
      icon_size: config.icon_size || 28,
      font_size: config.font_size || 0.75,
      stop_entity: config.stop_entity || null,
    };
    this._initialized = false;
    this._render();
  }

  set hass(hass) {
    const prevScripts = this._scripts.map((s) => s.entity_id).join(",");
    this._hass = hass;
    this._scripts = this._getScripts();
    const newScripts = this._scripts.map((s) => s.entity_id).join(",");

    if (!this._initialized) {
      this._initialized = true;
      this._render();
    } else if (prevScripts !== newScripts) {
      this._renderButtons();
    }
  }

  _getScripts() {
    if (!this._hass) return [];
    const label = this._config.label;
    const entityRegistry = this._hass.entities || {};
    return Object.values(this._hass.states)
      .filter((state) => {
        if (!state.entity_id.startsWith("script.")) return false;
        const regEntry = entityRegistry[state.entity_id];
        const labels = regEntry?.labels || [];
        return labels.some((l) => l.toLowerCase() === label.toLowerCase());
      })
      .sort((a, b) =>
        (a.attributes.friendly_name || a.entity_id).localeCompare(
          b.attributes.friendly_name || b.entity_id
        )
      );
  }

  _runScript(entityId) {
    this._hass.callService("script", "turn_on", { entity_id: entityId });
  }

  _pressStop() {
    const entity = this._config.stop_entity;
    if (!entity || !this._hass) return;
    const domain = entity.split(".")[0];
    if (domain === "button") {
      this._hass.callService("button", "press", { entity_id: entity });
    } else if (domain === "script") {
      this._hass.callService("script", "turn_on", { entity_id: entity });
    } else if (domain === "input_button") {
      this._hass.callService("input_button", "press", { entity_id: entity });
    }
  }

  _navigate(path) {
    history.pushState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  _render() {
    const { title, columns, blueprint_path, icon_size, font_size, stop_entity } = this._config;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { padding: 12px; box-sizing: border-box; }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 0 4px;
          min-height: 32px;
          gap: 8px;
        }
        .title {
          font-size: 1em;
          font-weight: 500;
          color: var(--primary-text-color);
          flex: 1;
        }
        .header-btns {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .add-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary-color);
          color: var(--text-primary-color, #fff);
          cursor: pointer;
          border: none;
          font-size: 1.4em;
          line-height: 1;
          flex-shrink: 0;
          transition: opacity 0.15s;
        }
        .add-btn:hover { opacity: 0.85; }
        .stop-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--error-color, #db4437);
          color: #fff;
          cursor: pointer;
          border: none;
          flex-shrink: 0;
          transition: opacity 0.15s;
        }
        .stop-btn:hover { opacity: 0.85; }
        .stop-btn ha-icon {
          --mdc-icon-size: 18px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(${columns}, 1fr);
          gap: 8px;
        }
        .script-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px 6px;
          border-radius: 12px;
          background: var(--card-background-color, #1c1c1c);
          border: 1px solid var(--divider-color, rgba(255,255,255,0.1));
          cursor: pointer;
          transition: background 0.15s;
          min-height: 72px;
        }
        .script-btn:hover, .script-btn:active {
          background: var(--secondary-background-color);
        }
        .script-btn ha-icon {
          --mdc-icon-size: ${icon_size}px;
          color: var(--primary-color);
        }
        .script-btn .name {
          font-size: ${font_size}em;
          text-align: center;
          color: var(--primary-text-color);
          line-height: 1.2;
          word-break: break-word;
        }
        .empty {
          grid-column: 1 / -1;
          text-align: center;
          color: var(--secondary-text-color);
          font-size: 0.85em;
          padding: 16px 0;
        }
      </style>
      <ha-card>
        <div class="header">
          ${title ? `<span class="title">${title}</span>` : `<span class="title"></span>`}
          <div class="header-btns">
            ${stop_entity ? `
              <button class="stop-btn" id="stop-btn" title="Kochen beenden">
                <ha-icon icon="mdi:stop"></ha-icon>
              </button>` : ""}
            <button class="add-btn" id="add-btn" title="Neue Einstellung anlegen">+</button>
          </div>
        </div>
        <div class="grid" id="grid"></div>
      </ha-card>
    `;

    this.shadowRoot
      .getElementById("add-btn")
      .addEventListener("click", () => this._navigate(blueprint_path));

    const stopBtn = this.shadowRoot.getElementById("stop-btn");
    if (stopBtn) {
      stopBtn.addEventListener("click", () => this._pressStop());
    }

    this._renderButtons();
  }

  _renderButtons() {
    const grid = this.shadowRoot.getElementById("grid");
    if (!grid) return;
    this._scripts = this._getScripts();

    if (this._scripts.length === 0) {
      grid.innerHTML = `<div class="empty">Keine Rezepte gefunden.<br>Tippe auf + um ein neues anzulegen.</div>`;
      return;
    }

    grid.innerHTML = this._scripts
      .map((state) => {
        const name = state.attributes.friendly_name || state.entity_id.replace("script.", "");
        const icon = state.attributes.icon || "mdi:chef-hat";
        return `
          <button class="script-btn" data-entity="${state.entity_id}">
            <ha-icon icon="${icon}"></ha-icon>
            <span class="name">${name}</span>
          </button>
        `;
      })
      .join("");

    grid.querySelectorAll(".script-btn").forEach((btn) => {
      btn.addEventListener("click", () => this._runScript(btn.dataset.entity));
    });
  }

  getCardSize() {
    return Math.ceil(this._scripts.length / this._config.columns) + 1;
  }

  static getConfigElement() {
    return document.createElement("ha-airfryer-card-editor");
  }

  static getStubConfig() {
    return {
      label: "airfryer",
      columns: 3,
      title: "Airfryer Rezepte",
      icon_size: 28,
      font_size: 0.75,
      stop_entity: "",
    };
  }
}

// ── Visual Editor ──────────────────────────────────────────────────────────

class HaAiryerCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._hass = null;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    // Entitäts-Dropdown befüllen falls noch nicht geschehen
    const sel = this.querySelector("#stop_entity");
    if (sel && sel.options.length <= 1) {
      this._fillStopEntities(sel);
    }
  }

  _fillStopEntities(sel) {
    if (!this._hass) return;
    const current = this._config.stop_entity || "";
    const candidates = Object.keys(this._hass.states)
      .filter((id) => ["button", "script", "input_button"].includes(id.split(".")[0]))
      .sort();
    candidates.forEach((id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = this._hass.states[id]?.attributes?.friendly_name || id;
      if (id === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  _field(label, id, type, value, extra = "") {
    return `
      <label style="display:flex;flex-direction:column;gap:4px;font-size:0.9em">
        ${label}
        <input type="${type}" id="${id}" value="${value}" ${extra}
          style="padding:6px;border-radius:6px;border:1px solid var(--divider-color);
                 background:var(--card-background-color);color:var(--primary-text-color)"/>
      </label>`;
  }

  _render() {
    const c = this._config;
    this.innerHTML = `
      <div style="padding:8px;display:flex;flex-direction:column;gap:12px;">
        ${this._field("Titel (optional)", "title", "text", c.title || "")}
        ${this._field("Label der Skripte", "label", "text", c.label || "airfryer")}
        ${this._field("Spalten", "columns", "number", c.columns || 3, 'min="1" max="6"')}
        ${this._field("Icon-Größe (px)", "icon_size", "number", c.icon_size || 28, 'min="16" max="64"')}
        ${this._field("Schriftgröße (em)", "font_size", "number", c.font_size || 0.75, 'min="0.5" max="2" step="0.05"')}
        <label style="display:flex;flex-direction:column;gap:4px;font-size:0.9em">
          Stop-Button Entität (optional)
          <select id="stop_entity"
            style="padding:6px;border-radius:6px;border:1px solid var(--divider-color);
                   background:var(--card-background-color);color:var(--primary-text-color)">
            <option value="">— kein Stop-Button —</option>
          </select>
        </label>
      </div>
    `;

    const sel = this.querySelector("#stop_entity");
    this._fillStopEntities(sel);

    ["title", "label", "columns", "icon_size", "font_size"].forEach((id) => {
      this.querySelector(`#${id}`).addEventListener("change", (e) => {
        const numFields = ["columns", "icon_size", "font_size"];
        const val = numFields.includes(id) ? parseFloat(e.target.value) : e.target.value;
        this._config = { ...this._config, [id]: val };
        this._fireChange();
      });
    });

    sel.addEventListener("change", (e) => {
      this._config = { ...this._config, stop_entity: e.target.value || null };
      this._fireChange();
    });
  }

  _fireChange() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define("ha-airfryer-card", HaAiryerCard);
customElements.define("ha-airfryer-card-editor", HaAiryerCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-airfryer-card",
  name: "Airfryer Rezepte",
  description: "Zeigt alle Airfryer-Rezepte (Skripte mit Label) als Buttons an.",
  preview: true,
});
