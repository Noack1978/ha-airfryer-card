/**
 * ha-airfryer-card
 * Lovelace-Karte für Airfryer-Rezepte mit manueller Steuerung.
 */

const DEFAULT_LABEL = "airfryer";
const DEFAULT_BLUEPRINT_PATH = "/config/blueprint/dashboard";

// Alle konfigurierbaren Steuerelemente
const CONTROLS = [
  { key: "entity_power",       label: "Stromversorgung",      type: "switch",  icon: "mdi:power",         section: "main" },
  { key: "entity_temp",        label: "Temperatur",           type: "number",  icon: "mdi:thermometer",   section: "main", unit: "°C" },
  { key: "entity_time",        label: "Kochzeit",             type: "number",  icon: "mdi:timer",         section: "main", unit: "min" },
  { key: "entity_start",       label: "Kochen starten",       type: "button",  icon: "mdi:play",          section: "actions" },
  { key: "entity_pause",       label: "Pause",                type: "button",  icon: "mdi:pause",         section: "actions" },
  { key: "entity_stop",        label: "Stopp",                type: "button",  icon: "mdi:stop",          section: "actions" },
  { key: "entity_preheat",     label: "Vorheizen",            type: "switch",  icon: "mdi:fire",          section: "warm" },
  { key: "entity_keep_warm",   label: "Warmhalten",           type: "button",  icon: "mdi:coffee-warm",   section: "warm" },
  { key: "entity_warm_time",   label: "Warmhaltedauer",       type: "number",  icon: "mdi:timer-outline", section: "warm", unit: "min" },
  { key: "entity_warm_temp",   label: "Warmhaltetemperatur",  type: "number",  icon: "mdi:thermometer-lines", section: "warm", unit: "°C" },
  { key: "entity_cook_method", label: "Kochmethode",          type: "select",  icon: "mdi:chef-hat",      section: "warm" },
];

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
      ...Object.fromEntries(CONTROLS.map((c) => [c.key, config[c.key] || null])),
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
    } else {
      this._updateControls();
      if (prevScripts !== newScripts) this._renderButtons();
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

  _callService(domain, service, entityId, data = {}) {
    this._hass.callService(domain, service, { entity_id: entityId, ...data });
  }

  _navigate(path) {
    history.pushState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  _stateOf(key) {
    const id = this._config[key];
    return id && this._hass ? this._hass.states[id] : null;
  }

  // Rendert die komplette Karte
  _render() {
    const { title, columns, blueprint_path, icon_size, font_size } = this._config;
    const hasAnyControl = CONTROLS.some((c) => this._config[c.key]);

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { padding: 12px; box-sizing: border-box; }

        /* ── Header ── */
        .header {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: ${hasAnyControl ? "12px" : "10px"};
          padding: 0 4px; min-height: 32px; gap: 8px;
        }
        .title { font-size: 1em; font-weight: 500; color: var(--primary-text-color); flex: 1; }
        .header-btns { display: flex; gap: 8px; align-items: center; }
        .add-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--primary-color); color: var(--text-primary-color, #fff);
          cursor: pointer; border: none; font-size: 1.4em; line-height: 1;
          transition: opacity 0.15s;
        }
        .add-btn:hover { opacity: 0.85; }

        /* ── Manuelle Steuerung ── */
        .controls { margin-bottom: 12px; }
        .section-label {
          font-size: 0.72em; font-weight: 600; letter-spacing: 0.06em;
          color: var(--secondary-text-color); text-transform: uppercase;
          margin: 10px 4px 6px; display: block;
        }
        .divider {
          border: none; border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1));
          margin: 10px 0;
        }

        /* Slider-Zeile */
        .slider-row {
          display: flex; align-items: center; gap: 8px; padding: 4px 4px;
        }
        .slider-row ha-icon {
          --mdc-icon-size: 18px; color: var(--primary-color); flex-shrink: 0;
        }
        .slider-row input[type=range] {
          flex: 1; accent-color: var(--primary-color); cursor: pointer;
        }
        .slider-val {
          font-size: 0.8em; color: var(--primary-text-color);
          min-width: 52px; text-align: right; flex-shrink: 0;
        }

        /* Toggle-Zeile */
        .toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 6px 4px;
        }
        .toggle-row .row-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.85em; color: var(--primary-text-color);
        }
        .toggle-row ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); }
        .toggle {
          position: relative; width: 42px; height: 24px; flex-shrink: 0;
        }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .toggle-slider {
          position: absolute; inset: 0; border-radius: 24px; cursor: pointer;
          background: var(--divider-color, #555); transition: background 0.2s;
        }
        .toggle-slider::before {
          content: ""; position: absolute;
          width: 18px; height: 18px; border-radius: 50%;
          left: 3px; top: 3px; background: #fff; transition: transform 0.2s;
        }
        .toggle input:checked + .toggle-slider { background: var(--primary-color); }
        .toggle input:checked + .toggle-slider::before { transform: translateX(18px); }

        /* Action-Buttons */
        .action-row {
          display: flex; gap: 8px; padding: 4px 0; flex-wrap: wrap;
        }
        .action-btn {
          flex: 1; min-width: 60px;
          display: flex; flex-direction: column; align-items: center;
          gap: 4px; padding: 8px 4px; border-radius: 10px; border: none;
          cursor: pointer; transition: opacity 0.15s; font-size: 0.75em;
          color: var(--text-primary-color, #fff);
        }
        .action-btn ha-icon { --mdc-icon-size: 20px; }
        .action-btn.start { background: var(--success-color, #43a047); }
        .action-btn.pause { background: var(--warning-color, #fb8c00); }
        .action-btn.stop  { background: var(--error-color, #db4437); }
        .action-btn.warm  { background: var(--info-color, #039be5); }
        .action-btn:hover { opacity: 0.85; }

        /* Select */
        .select-row {
          display: flex; align-items: center; gap: 8px; padding: 4px 4px;
        }
        .select-row ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); flex-shrink: 0; }
        .select-row select {
          flex: 1; padding: 5px 8px; border-radius: 8px;
          border: 1px solid var(--divider-color); font-size: 0.85em;
          background: var(--card-background-color); color: var(--primary-text-color);
          cursor: pointer;
        }

        /* ── Rezept-Grid ── */
        .section-recipes {}
        .grid {
          display: grid;
          grid-template-columns: repeat(${columns}, 1fr);
          gap: 8px;
        }
        .script-btn {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 6px; padding: 12px 6px; border-radius: 12px;
          background: var(--card-background-color, #1c1c1c);
          border: 1px solid var(--divider-color, rgba(255,255,255,0.1));
          cursor: pointer; transition: background 0.15s; min-height: 72px;
        }
        .script-btn:hover, .script-btn:active { background: var(--secondary-background-color); }
        .script-btn ha-icon { --mdc-icon-size: ${icon_size}px; color: var(--primary-color); }
        .script-btn .name {
          font-size: ${font_size}em; text-align: center;
          color: var(--primary-text-color); line-height: 1.2; word-break: break-word;
        }
        .empty {
          grid-column: 1 / -1; text-align: center;
          color: var(--secondary-text-color); font-size: 0.85em; padding: 16px 0;
        }
      </style>
      <ha-card>
        <div class="header">
          ${title ? `<span class="title">${title}</span>` : `<span class="title"></span>`}
          <div class="header-btns">
            <button class="add-btn" id="add-btn" title="Neue Einstellung anlegen">+</button>
          </div>
        </div>
        ${hasAnyControl ? `<div class="controls" id="controls"></div><hr class="divider"/>` : ""}
        <div class="section-recipes">
          <div class="grid" id="grid"></div>
        </div>
      </ha-card>
    `;

    this.shadowRoot.getElementById("add-btn")
      .addEventListener("click", () => this._navigate(blueprint_path));

    if (hasAnyControl) this._updateControls();
    this._renderButtons();
  }

  // Aktualisiert die Steuerung (Werte + State)
  _updateControls() {
    const container = this.shadowRoot.getElementById("controls");
    if (!container) return;

    const cfg = this._config;
    const sections = { main: [], actions: [], warm: [] };

    // Haupt-Section
    if (cfg.entity_power) {
      const st = this._stateOf("entity_power");
      const on = st?.state === "on";
      sections.main.push(`
        <div class="toggle-row">
          <span class="row-label">
            <ha-icon icon="mdi:power"></ha-icon> Stromversorgung
          </span>
          <label class="toggle">
            <input type="checkbox" id="toggle_power" ${on ? "checked" : ""}/>
            <span class="toggle-slider"></span>
          </label>
        </div>`);
    }

    if (cfg.entity_temp) {
      const st = this._stateOf("entity_temp");
      const val = parseFloat(st?.state || 0);
      const min = st?.attributes?.min || 40;
      const max = st?.attributes?.max || 200;
      const step = st?.attributes?.step || 5;
      const unit = st?.attributes?.unit_of_measurement || "°C";
      sections.main.push(`
        <div class="slider-row">
          <ha-icon icon="mdi:thermometer"></ha-icon>
          <input type="range" id="slider_temp" min="${min}" max="${max}" step="${step}" value="${val}"/>
          <span class="slider-val" id="val_temp">${val} ${unit}</span>
        </div>`);
    }

    if (cfg.entity_time) {
      const st = this._stateOf("entity_time");
      const val = parseFloat(st?.state || 0);
      const min = st?.attributes?.min || 1;
      const max = st?.attributes?.max || 60;
      const step = st?.attributes?.step || 1;
      const unit = st?.attributes?.unit_of_measurement || "min";
      sections.main.push(`
        <div class="slider-row">
          <ha-icon icon="mdi:timer"></ha-icon>
          <input type="range" id="slider_time" min="${min}" max="${max}" step="${step}" value="${val}"/>
          <span class="slider-val" id="val_time">${val} ${unit}</span>
        </div>`);
    }

    // Action-Buttons
    const actionBtns = [];
    if (cfg.entity_start) actionBtns.push(`<button class="action-btn start" id="btn_start"><ha-icon icon="mdi:play"></ha-icon>Starten</button>`);
    if (cfg.entity_pause) actionBtns.push(`<button class="action-btn pause" id="btn_pause"><ha-icon icon="mdi:pause"></ha-icon>Pause</button>`);
    if (cfg.entity_stop)  actionBtns.push(`<button class="action-btn stop"  id="btn_stop"><ha-icon icon="mdi:stop"></ha-icon>Stopp</button>`);
    if (actionBtns.length) sections.actions.push(`<div class="action-row">${actionBtns.join("")}</div>`);

    // Warm-Section
    if (cfg.entity_preheat) {
      const st = this._stateOf("entity_preheat");
      const on = st?.state === "on";
      sections.warm.push(`
        <div class="toggle-row">
          <span class="row-label"><ha-icon icon="mdi:fire"></ha-icon> Vorheizen</span>
          <label class="toggle">
            <input type="checkbox" id="toggle_preheat" ${on ? "checked" : ""}/>
            <span class="toggle-slider"></span>
          </label>
        </div>`);
    }

    if (cfg.entity_keep_warm) sections.warm.push(`
      <div class="action-row">
        <button class="action-btn warm" id="btn_keep_warm" style="flex:none;padding:8px 16px;flex-direction:row;gap:6px;">
          <ha-icon icon="mdi:coffee-warm"></ha-icon>Warmhalten
        </button>
      </div>`);

    if (cfg.entity_warm_temp) {
      const st = this._stateOf("entity_warm_temp");
      const val = parseFloat(st?.state || 0);
      const min = st?.attributes?.min || 40;
      const max = st?.attributes?.max || 100;
      const step = st?.attributes?.step || 5;
      const unit = st?.attributes?.unit_of_measurement || "°C";
      sections.warm.push(`
        <div class="slider-row">
          <ha-icon icon="mdi:thermometer-lines"></ha-icon>
          <input type="range" id="slider_warm_temp" min="${min}" max="${max}" step="${step}" value="${val}"/>
          <span class="slider-val" id="val_warm_temp">${val} ${unit}</span>
        </div>`);
    }

    if (cfg.entity_warm_time) {
      const st = this._stateOf("entity_warm_time");
      const val = parseFloat(st?.state || 0);
      const min = st?.attributes?.min || 1;
      const max = st?.attributes?.max || 60;
      const step = st?.attributes?.step || 1;
      const unit = st?.attributes?.unit_of_measurement || "min";
      sections.warm.push(`
        <div class="slider-row">
          <ha-icon icon="mdi:timer-outline"></ha-icon>
          <input type="range" id="slider_warm_time" min="${min}" max="${max}" step="${step}" value="${val}"/>
          <span class="slider-val" id="val_warm_time">${val} ${unit}</span>
        </div>`);
    }

    if (cfg.entity_cook_method) {
      const st = this._stateOf("entity_cook_method");
      const current = st?.state || "";
      const options = st?.attributes?.options || [];
      const opts = options.map((o) => `<option value="${o}" ${o === current ? "selected" : ""}>${o}</option>`).join("");
      sections.warm.push(`
        <div class="select-row">
          <ha-icon icon="mdi:chef-hat"></ha-icon>
          <select id="sel_cook_method">${opts}</select>
        </div>`);
    }

    // HTML zusammenbauen
    let html = "";
    if (sections.main.length) {
      html += `<span class="section-label">Manuelle Steuerung</span>`;
      html += sections.main.join("");
    }
    if (sections.actions.length) html += sections.actions.join("");
    if (sections.warm.length && (sections.main.length || sections.actions.length)) {
      html += `<hr class="divider"/>`;
    }
    if (sections.warm.length) {
      html += `<span class="section-label">Warmhalten & Einstellungen</span>`;
      html += sections.warm.join("");
    }

    container.innerHTML = html;
    this._bindControlEvents(container);
  }

  _bindControlEvents(c) {
    const cfg = this._config;

    // Toggles
    const tp = c.querySelector("#toggle_power");
    if (tp) tp.addEventListener("change", () =>
      this._callService("switch", tp.checked ? "turn_on" : "turn_off", cfg.entity_power));

    const tph = c.querySelector("#toggle_preheat");
    if (tph) tph.addEventListener("change", () =>
      this._callService("switch", tph.checked ? "turn_on" : "turn_off", cfg.entity_preheat));

    // Slider Temperatur
    const st = c.querySelector("#slider_temp");
    const vt = c.querySelector("#val_temp");
    if (st) {
      const unit = this._stateOf("entity_temp")?.attributes?.unit_of_measurement || "°C";
      st.addEventListener("input", () => { vt.textContent = `${st.value} ${unit}`; });
      st.addEventListener("change", () =>
        this._callService("number", "set_value", cfg.entity_temp, { value: parseFloat(st.value) }));
    }

    // Slider Zeit
    const stime = c.querySelector("#slider_time");
    const vtime = c.querySelector("#val_time");
    if (stime) {
      const unit = this._stateOf("entity_time")?.attributes?.unit_of_measurement || "min";
      stime.addEventListener("input", () => { vtime.textContent = `${stime.value} ${unit}`; });
      stime.addEventListener("change", () =>
        this._callService("number", "set_value", cfg.entity_time, { value: parseFloat(stime.value) }));
    }

    // Slider Warmhaltetemperatur
    const swt = c.querySelector("#slider_warm_temp");
    const vwt = c.querySelector("#val_warm_temp");
    if (swt) {
      const unit = this._stateOf("entity_warm_temp")?.attributes?.unit_of_measurement || "°C";
      swt.addEventListener("input", () => { vwt.textContent = `${swt.value} ${unit}`; });
      swt.addEventListener("change", () =>
        this._callService("number", "set_value", cfg.entity_warm_temp, { value: parseFloat(swt.value) }));
    }

    // Slider Warmhaltedauer
    const swtime = c.querySelector("#slider_warm_time");
    const vwtime = c.querySelector("#val_warm_time");
    if (swtime) {
      const unit = this._stateOf("entity_warm_time")?.attributes?.unit_of_measurement || "min";
      swtime.addEventListener("input", () => { vwtime.textContent = `${swtime.value} ${unit}`; });
      swtime.addEventListener("change", () =>
        this._callService("number", "set_value", cfg.entity_warm_time, { value: parseFloat(swtime.value) }));
    }

    // Action-Buttons
    const bs = c.querySelector("#btn_start");
    if (bs) bs.addEventListener("click", () => this._callService("button", "press", cfg.entity_start));
    const bp = c.querySelector("#btn_pause");
    if (bp) bp.addEventListener("click", () => this._callService("button", "press", cfg.entity_pause));
    const bst = c.querySelector("#btn_stop");
    if (bst) bst.addEventListener("click", () => this._callService("button", "press", cfg.entity_stop));
    const bkw = c.querySelector("#btn_keep_warm");
    if (bkw) bkw.addEventListener("click", () => this._callService("button", "press", cfg.entity_keep_warm));

    // Select Kochmethode
    const sel = c.querySelector("#sel_cook_method");
    if (sel) sel.addEventListener("change", () =>
      this._callService("select", "select_option", cfg.entity_cook_method, { option: sel.value }));
  }

  _renderButtons() {
    const grid = this.shadowRoot.getElementById("grid");
    if (!grid) return;
    this._scripts = this._getScripts();

    if (this._scripts.length === 0) {
      grid.innerHTML = `<div class="empty">Keine Rezepte gefunden.<br>Tippe auf + um ein neues anzulegen.</div>`;
      return;
    }

    grid.innerHTML = this._scripts.map((state) => {
      const name = state.attributes.friendly_name || state.entity_id.replace("script.", "");
      const icon = state.attributes.icon || "mdi:chef-hat";
      return `
        <button class="script-btn" data-entity="${state.entity_id}">
          <ha-icon icon="${icon}"></ha-icon>
          <span class="name">${name}</span>
        </button>`;
    }).join("");

    grid.querySelectorAll(".script-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        this._hass.callService("script", "turn_on", { entity_id: btn.dataset.entity }));
    });
  }

  getCardSize() {
    return Math.ceil(this._scripts.length / this._config.columns) + 2;
  }

  static getConfigElement() {
    return document.createElement("ha-airfryer-card-editor");
  }

  static getStubConfig() {
    return { label: "airfryer", columns: 3, title: "Airfryer Rezepte", icon_size: 28, font_size: 0.75 };
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
    // Entity-Dropdowns befüllen
    this.querySelectorAll("select[data-domain]").forEach((sel) => this._fillSelect(sel));
  }

  _fillSelect(sel) {
    if (!this._hass || sel.dataset.filled) return;
    sel.dataset.filled = "1";
    const domains = sel.dataset.domain.split(",");
    const current = sel.dataset.current || "";
    const candidates = Object.keys(this._hass.states)
      .filter((id) => domains.includes(id.split(".")[0]))
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
    return `<label style="display:flex;flex-direction:column;gap:4px;font-size:0.9em">
      ${label}
      <input type="${type}" id="${id}" value="${value}" ${extra}
        style="padding:6px;border-radius:6px;border:1px solid var(--divider-color);
               background:var(--card-background-color);color:var(--primary-text-color)"/>
    </label>`;
  }

  _entitySelect(label, key, domains) {
    const current = this._config[key] || "";
    return `<label style="display:flex;flex-direction:column;gap:4px;font-size:0.9em">
      ${label}
      <select id="${key}" data-domain="${domains}" data-current="${current}"
        style="padding:6px;border-radius:6px;border:1px solid var(--divider-color);
               background:var(--card-background-color);color:var(--primary-text-color)">
        <option value="">— nicht verwendet —</option>
      </select>
    </label>`;
  }

  _render() {
    const c = this._config;
    this.innerHTML = `
      <div style="padding:8px;display:flex;flex-direction:column;gap:12px;">
        <b style="font-size:0.9em;color:var(--primary-text-color)">Allgemein</b>
        ${this._field("Titel (optional)", "title", "text", c.title || "")}
        ${this._field("Label der Skripte", "label", "text", c.label || "airfryer")}
        ${this._field("Spalten", "columns", "number", c.columns || 3, 'min="1" max="6"')}
        ${this._field("Icon-Größe (px)", "icon_size", "number", c.icon_size || 28, 'min="16" max="64"')}
        ${this._field("Schriftgröße (em)", "font_size", "number", c.font_size || 0.75, 'min="0.5" max="2" step="0.05"')}

        <b style="font-size:0.9em;color:var(--primary-text-color)">Manuelle Steuerung</b>
        ${this._entitySelect("Stromversorgung", "entity_power", "switch")}
        ${this._entitySelect("Temperatur", "entity_temp", "number")}
        ${this._entitySelect("Kochzeit", "entity_time", "number")}
        ${this._entitySelect("Kochen starten", "entity_start", "button")}
        ${this._entitySelect("Pause", "entity_pause", "button")}
        ${this._entitySelect("Stopp", "entity_stop", "button")}

        <b style="font-size:0.9em;color:var(--primary-text-color)">Warmhalten & Einstellungen</b>
        ${this._entitySelect("Vorheizen", "entity_preheat", "switch")}
        ${this._entitySelect("Warmhalten", "entity_keep_warm", "button")}
        ${this._entitySelect("Warmhaltetemperatur", "entity_warm_temp", "number")}
        ${this._entitySelect("Warmhaltedauer", "entity_warm_time", "number")}
        ${this._entitySelect("Kochmethode", "entity_cook_method", "select")}
      </div>
    `;

    // Text/Number Inputs
    ["title", "label", "columns", "icon_size", "font_size"].forEach((id) => {
      const el = this.querySelector(`#${id}`);
      if (!el) return;
      el.addEventListener("change", (e) => {
        const num = ["columns", "icon_size", "font_size"].includes(id);
        this._config = { ...this._config, [id]: num ? parseFloat(e.target.value) : e.target.value };
        this._fireChange();
      });
    });

    // Entity Selects
    CONTROLS.forEach(({ key }) => {
      const el = this.querySelector(`#${key}`);
      if (!el) return;
      if (this._hass) this._fillSelect(el);
      el.addEventListener("change", (e) => {
        this._config = { ...this._config, [key]: e.target.value || null };
        this._fireChange();
      });
    });
  }

  _fireChange() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config }, bubbles: true, composed: true,
    }));
  }
}

customElements.define("ha-airfryer-card", HaAiryerCard);
customElements.define("ha-airfryer-card-editor", HaAiryerCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-airfryer-card",
  name: "Airfryer Rezepte",
  description: "Airfryer-Steuerung mit Rezepten, manueller Steuerung und Warmhalten.",
  preview: true,
});
