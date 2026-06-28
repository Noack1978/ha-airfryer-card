/**
 * ha-airfryer-card
 * Lovelace-Karte für Airfryer-Rezepte mit manueller Steuerung.
 * Responsive: ab 480px werden Steuerung und Warmhalten nebeneinander angezeigt.
 */

const DEFAULT_LABEL = "airfryer";
const DEFAULT_BLUEPRINT_PATH = "/config/blueprint/dashboard";

const CONTROLS = [
  { key: "entity_power",       label: "Stromversorgung",      type: "switch",  section: "main" },
  { key: "entity_temp",        label: "Temperatur",           type: "number",  section: "main" },
  { key: "entity_time",        label: "Kochzeit",             type: "number",  section: "main" },
  { key: "entity_start",       label: "Kochen starten",       type: "button",  section: "actions" },
  { key: "entity_pause",       label: "Pause",                type: "button",  section: "actions" },
  { key: "entity_stop",        label: "Stopp",                type: "button",  section: "actions" },
  { key: "entity_preheat",     label: "Vorheizen",            type: "switch",  section: "warm" },
  { key: "entity_keep_warm",   label: "Warmhalten",           type: "button",  section: "warm" },
  { key: "entity_warm_temp",   label: "Warmhaltetemperatur",  type: "number",  section: "warm" },
  { key: "entity_warm_time",   label: "Warmhaltedauer",       type: "number",  section: "warm" },
  { key: "entity_cook_method", label: "Kochmethode",          type: "select",  section: "warm" },
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
      temp_steps: config.temp_steps || [5, 10],
      temp_presets: config.temp_presets || [],
      time_steps: config.time_steps || [1, 5],
      time_presets: config.time_presets || [],
      warm_temp_steps: config.warm_temp_steps || [5],
      warm_time_steps: config.warm_time_steps || [1, 5],
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

  _adjustNumber(key, delta) {
    const st = this._stateOf(key);
    if (!st) return;
    const cur = parseFloat(st.state);
    const min = parseFloat(st.attributes.min ?? -Infinity);
    const max = parseFloat(st.attributes.max ?? Infinity);
    const newVal = Math.min(max, Math.max(min, cur + delta));
    this._callService("number", "set_value", this._config[key], { value: newVal });
  }

  _setNumber(key, val) {
    const st = this._stateOf(key);
    if (!st) return;
    const min = parseFloat(st.attributes.min ?? -Infinity);
    const max = parseFloat(st.attributes.max ?? Infinity);
    const clamped = Math.min(max, Math.max(min, val));
    this._callService("number", "set_value", this._config[key], { value: clamped });
  }

  _hasMain() {
    return ["entity_power","entity_temp","entity_time","entity_start","entity_pause","entity_stop"]
      .some((k) => this._config[k]);
  }

  _hasWarm() {
    return ["entity_preheat","entity_keep_warm","entity_warm_temp","entity_warm_time","entity_cook_method"]
      .some((k) => this._config[k]);
  }

  // Baut +/- Steuerblock für eine number-Entität
  _numberControl(key, icon, stepCfgKey, presetCfgKey) {
    const st = this._stateOf(key);
    if (!st) return "";
    const val = parseFloat(st.state);
    const unit = st.attributes.unit_of_measurement || "";
    const steps = this._config[stepCfgKey] || [1];
    const presets = this._config[presetCfgKey] || [];

    const stepBtns = steps.map((s) => `
      <button class="adj-btn" data-key="${key}" data-delta="-${s}">−${s}</button>
      <button class="adj-btn" data-key="${key}" data-delta="${s}">+${s}</button>
    `).join("");

    const presetBtns = presets.length ? `
      <div class="preset-row">
        ${presets.map((p) => `<button class="preset-btn" data-key="${key}" data-val="${p}">${p}${unit}</button>`).join("")}
      </div>` : "";

    return `
      <div class="number-control">
        <div class="number-header">
          <ha-icon icon="${icon}"></ha-icon>
          <span class="number-val" id="val_${key}">${val} ${unit}</span>
        </div>
        <div class="step-row">${stepBtns}</div>
        ${presetBtns}
      </div>`;
  }

  _render() {
    const { title, columns, blueprint_path, icon_size, font_size } = this._config;
    const hasMain = this._hasMain();
    const hasWarm = this._hasWarm();
    const hasControls = hasMain || hasWarm;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; container-type: inline-size; }
        ha-card { padding: 12px; box-sizing: border-box; }

        .header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px; padding: 0 4px; min-height: 32px; gap: 8px;
        }
        .title { font-size: 1em; font-weight: 500; color: var(--primary-text-color); flex: 1; }
        .add-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--primary-color); color: var(--text-primary-color, #fff);
          cursor: pointer; border: none; font-size: 1.4em; line-height: 1;
          transition: opacity 0.15s; flex-shrink: 0;
        }
        .add-btn:hover { opacity: 0.85; }

        /* Zwei-Spalten */
        .controls-wrapper { display: flex; flex-direction: column; gap: 0; margin-bottom: 12px; }
        @container (min-width: 480px) {
          .controls-wrapper { flex-direction: row; gap: 12px; }
          .col-main { flex: 1; border-right: 1px solid var(--divider-color, rgba(255,255,255,0.1)); padding-right: 12px; }
          .col-warm { flex: 1; }
          .col-divider { display: none; }
        }
        .col-main { flex: 1; }
        .col-warm { flex: 1; }
        .col-divider { border: none; border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1)); margin: 10px 0; }

        .section-label {
          font-size: 0.72em; font-weight: 600; letter-spacing: 0.06em;
          color: var(--secondary-text-color); text-transform: uppercase;
          margin: 0 4px 8px; display: block;
        }

        /* Toggle */
        .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 4px; }
        .toggle-row .row-label { display: flex; align-items: center; gap: 6px; font-size: 0.85em; color: var(--primary-text-color); }
        .toggle-row ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); }
        .toggle { position: relative; width: 42px; height: 24px; flex-shrink: 0; }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; inset: 0; border-radius: 24px; cursor: pointer; background: var(--divider-color, #555); transition: background 0.2s; }
        .toggle-slider::before { content: ""; position: absolute; width: 18px; height: 18px; border-radius: 50%; left: 3px; top: 3px; background: #fff; transition: transform 0.2s; }
        .toggle input:checked + .toggle-slider { background: var(--primary-color); }
        .toggle input:checked + .toggle-slider::before { transform: translateX(18px); }

        /* Number Control */
        .number-control { padding: 6px 4px; }
        .number-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .number-header ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); flex-shrink: 0; }
        .number-val { font-size: 1.3em; font-weight: 600; color: var(--primary-text-color); }
        .step-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .adj-btn {
          flex: 1; min-width: 40px; padding: 5px 4px; border-radius: 8px;
          border: 1px solid var(--primary-color); background: transparent;
          color: var(--primary-color); cursor: pointer; font-size: 0.8em;
          font-weight: 600; transition: background 0.15s, color 0.15s;
        }
        .adj-btn:hover { background: var(--primary-color); color: var(--text-primary-color, #fff); }
        .preset-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
        .preset-btn {
          padding: 5px 10px; border-radius: 8px; border: none;
          background: var(--secondary-background-color);
          color: var(--primary-text-color); cursor: pointer; font-size: 0.8em;
          font-weight: 600; transition: background 0.15s;
        }
        .preset-btn:hover { background: var(--primary-color); color: var(--text-primary-color, #fff); }

        /* Action Buttons */
        .action-row { display: flex; gap: 8px; padding: 6px 4px; flex-wrap: wrap; }
        .action-btn {
          flex: 1; min-width: 56px; display: flex; flex-direction: column;
          align-items: center; gap: 4px; padding: 8px 4px; border-radius: 10px;
          border: none; cursor: pointer; transition: opacity 0.15s; font-size: 0.75em; color: #fff;
        }
        .action-btn ha-icon { --mdc-icon-size: 20px; }
        .action-btn.start { background: var(--success-color, #43a047); }
        .action-btn.pause { background: var(--warning-color, #fb8c00); }
        .action-btn.stop  { background: var(--error-color, #db4437); }
        .action-btn.warm  { background: var(--info-color, #039be5); flex: none; padding: 8px 14px; flex-direction: row; gap: 6px; }
        .action-btn:hover { opacity: 0.85; }

        /* Select */
        .select-row { display: flex; align-items: center; gap: 8px; padding: 4px; }
        .select-row ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); flex-shrink: 0; }
        .select-row select {
          flex: 1; padding: 5px 8px; border-radius: 8px; min-width: 0;
          border: 1px solid var(--divider-color); font-size: 0.85em;
          background: var(--card-background-color); color: var(--primary-text-color); cursor: pointer;
        }

        /* Trennlinie */
        .recipe-divider { border: none; border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1)); margin: 0 0 12px; }

        /* Rezept-Grid */
        .grid { display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 8px; }
        .script-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; padding: 12px 6px; border-radius: 12px;
          background: var(--card-background-color, #1c1c1c);
          border: 1px solid var(--divider-color, rgba(255,255,255,0.1));
          cursor: pointer; transition: background 0.15s; min-height: 72px;
        }
        .script-btn:hover, .script-btn:active { background: var(--secondary-background-color); }
        .script-btn ha-icon { --mdc-icon-size: ${icon_size}px; color: var(--primary-color); }
        .script-btn .name { font-size: ${font_size}em; text-align: center; color: var(--primary-text-color); line-height: 1.2; word-break: break-word; }
        .empty { grid-column: 1 / -1; text-align: center; color: var(--secondary-text-color); font-size: 0.85em; padding: 16px 0; }
      </style>
      <ha-card>
        <div class="header">
          ${title ? `<span class="title">${title}</span>` : `<span class="title"></span>`}
          <button class="add-btn" id="add-btn" title="Neue Einstellung anlegen">+</button>
        </div>
        ${hasControls ? `
        <div class="controls-wrapper">
          ${hasMain ? `<div class="col-main" id="col-main"></div>` : ""}
          ${hasMain && hasWarm ? `<hr class="col-divider"/>` : ""}
          ${hasWarm ? `<div class="col-warm" id="col-warm"></div>` : ""}
        </div>
        <hr class="recipe-divider"/>` : ""}
        <div class="grid" id="grid"></div>
      </ha-card>
    `;

    this.shadowRoot.getElementById("add-btn")
      .addEventListener("click", () => this._navigate(blueprint_path));

    if (hasControls) this._updateControls();
    this._renderButtons();
  }

  _updateControls() {
    const cfg = this._config;

    // ── Linke Spalte ──
    const colMain = this.shadowRoot.getElementById("col-main");
    if (colMain) {
      let html = `<span class="section-label">Manuelle Steuerung</span>`;

      if (cfg.entity_power) {
        const on = this._stateOf("entity_power")?.state === "on";
        html += `<div class="toggle-row">
          <span class="row-label"><ha-icon icon="mdi:power"></ha-icon> Stromversorgung</span>
          <label class="toggle"><input type="checkbox" id="toggle_power" ${on ? "checked" : ""}/>
          <span class="toggle-slider"></span></label></div>`;
      }

      if (cfg.entity_temp) html += this._numberControl("entity_temp", "mdi:thermometer", "temp_steps", "temp_presets");
      if (cfg.entity_time) html += this._numberControl("entity_time", "mdi:timer", "time_steps", "time_presets");

      const actionBtns = [];
      if (cfg.entity_start) actionBtns.push(`<button class="action-btn start" id="btn_start"><ha-icon icon="mdi:play"></ha-icon>Starten</button>`);
      if (cfg.entity_pause) actionBtns.push(`<button class="action-btn pause" id="btn_pause"><ha-icon icon="mdi:pause"></ha-icon>Pause</button>`);
      if (cfg.entity_stop)  actionBtns.push(`<button class="action-btn stop"  id="btn_stop"><ha-icon icon="mdi:stop"></ha-icon>Stopp</button>`);
      if (actionBtns.length) html += `<div class="action-row">${actionBtns.join("")}</div>`;

      colMain.innerHTML = html;
      this._bindMainEvents(colMain);
    }

    // ── Rechte Spalte ──
    const colWarm = this.shadowRoot.getElementById("col-warm");
    if (colWarm) {
      let html = `<span class="section-label">Warmhalten & Einstellungen</span>`;

      if (cfg.entity_preheat) {
        const on = this._stateOf("entity_preheat")?.state === "on";
        html += `<div class="toggle-row">
          <span class="row-label"><ha-icon icon="mdi:fire"></ha-icon> Vorheizen</span>
          <label class="toggle"><input type="checkbox" id="toggle_preheat" ${on ? "checked" : ""}/>
          <span class="toggle-slider"></span></label></div>`;
      }

      if (cfg.entity_keep_warm) html += `<div class="action-row">
        <button class="action-btn warm" id="btn_keep_warm"><ha-icon icon="mdi:coffee-warm"></ha-icon>Warmhalten</button></div>`;

      if (cfg.entity_warm_temp) html += this._numberControl("entity_warm_temp", "mdi:thermometer-lines", "warm_temp_steps", "");
      if (cfg.entity_warm_time) html += this._numberControl("entity_warm_time", "mdi:timer-outline", "warm_time_steps", "");

      if (cfg.entity_cook_method) {
        const st = this._stateOf("entity_cook_method");
        const current = st?.state || "";
        const options = st?.attributes?.options || [];
        const opts = options.map((o) => `<option value="${o}" ${o === current ? "selected" : ""}>${o}</option>`).join("");
        html += `<div class="select-row"><ha-icon icon="mdi:chef-hat"></ha-icon>
          <select id="sel_cook_method">${opts}</select></div>`;
      }

      colWarm.innerHTML = html;
      this._bindWarmEvents(colWarm);
    }
  }

  _bindMainEvents(c) {
    const cfg = this._config;

    const tp = c.querySelector("#toggle_power");
    if (tp) tp.addEventListener("change", () =>
      this._callService("switch", tp.checked ? "turn_on" : "turn_off", cfg.entity_power));

    c.querySelectorAll(".adj-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        this._adjustNumber(btn.dataset.key, parseFloat(btn.dataset.delta)));
    });
    c.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        this._setNumber(btn.dataset.key, parseFloat(btn.dataset.val)));
    });

    const bs = c.querySelector("#btn_start");
    if (bs) bs.addEventListener("click", () => this._callService("button", "press", cfg.entity_start));
    const bp = c.querySelector("#btn_pause");
    if (bp) bp.addEventListener("click", () => this._callService("button", "press", cfg.entity_pause));
    const bst = c.querySelector("#btn_stop");
    if (bst) bst.addEventListener("click", () => this._callService("button", "press", cfg.entity_stop));
  }

  _bindWarmEvents(c) {
    const cfg = this._config;

    const tph = c.querySelector("#toggle_preheat");
    if (tph) tph.addEventListener("change", () =>
      this._callService("switch", tph.checked ? "turn_on" : "turn_off", cfg.entity_preheat));

    const bkw = c.querySelector("#btn_keep_warm");
    if (bkw) bkw.addEventListener("click", () => this._callService("button", "press", cfg.entity_keep_warm));

    c.querySelectorAll(".adj-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        this._adjustNumber(btn.dataset.key, parseFloat(btn.dataset.delta)));
    });

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
      return `<button class="script-btn" data-entity="${state.entity_id}">
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
    return Math.ceil(this._scripts.length / this._config.columns) + 3;
  }

  static getConfigElement() {
    return document.createElement("ha-airfryer-card-editor");
  }

  static getStubConfig() {
    return {
      label: "airfryer", columns: 3, title: "Airfryer Rezepte",
      icon_size: 28, font_size: 0.75,
      temp_steps: [5, 10], temp_presets: [180, 190, 200],
      time_steps: [1, 5], time_presets: [],
      warm_temp_steps: [5], warm_time_steps: [1, 5],
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
    this.querySelectorAll("select[data-domain]").forEach((sel) => this._fillSelect(sel));
  }

  _fillSelect(sel) {
    if (!this._hass || sel.dataset.filled) return;
    sel.dataset.filled = "1";
    const domains = sel.dataset.domain.split(",");
    const current = sel.dataset.current || "";
    Object.keys(this._hass.states)
      .filter((id) => domains.includes(id.split(".")[0]))
      .sort()
      .forEach((id) => {
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

  _listField(label, id, value) {
    const display = Array.isArray(value) ? value.join(", ") : (value || "");
    return `<label style="display:flex;flex-direction:column;gap:4px;font-size:0.9em">
      ${label} <span style="font-size:0.8em;color:var(--secondary-text-color)">(kommagetrennt, z.B. 5, 10)</span>
      <input type="text" id="${id}" value="${display}"
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

  _section(title) {
    return `<b style="font-size:0.9em;color:var(--primary-text-color)">${title}</b>`;
  }

  _render() {
    const c = this._config;
    this.innerHTML = `
      <div style="padding:8px;display:flex;flex-direction:column;gap:12px;">
        ${this._section("Allgemein")}
        ${this._field("Titel (optional)", "title", "text", c.title || "")}
        ${this._field("Label der Skripte", "label", "text", c.label || "airfryer")}
        ${this._field("Spalten", "columns", "number", c.columns || 3, 'min="1" max="6"')}
        ${this._field("Icon-Größe (px)", "icon_size", "number", c.icon_size || 28, 'min="16" max="64"')}
        ${this._field("Schriftgröße (em)", "font_size", "number", c.font_size || 0.75, 'min="0.5" max="2" step="0.05"')}

        ${this._section("Manuelle Steuerung (links)")}
        ${this._entitySelect("Stromversorgung", "entity_power", "switch")}
        ${this._entitySelect("Temperatur", "entity_temp", "number")}
        ${this._listField("Temperatur Schritte", "temp_steps", c.temp_steps)}
        ${this._listField("Temperatur Schnellwahl", "temp_presets", c.temp_presets)}
        ${this._entitySelect("Kochzeit", "entity_time", "number")}
        ${this._listField("Kochzeit Schritte", "time_steps", c.time_steps)}
        ${this._listField("Kochzeit Schnellwahl (min)", "time_presets", c.time_presets)}
        ${this._entitySelect("Kochen starten", "entity_start", "button")}
        ${this._entitySelect("Pause", "entity_pause", "button")}
        ${this._entitySelect("Stopp", "entity_stop", "button")}

        ${this._section("Warmhalten & Einstellungen (rechts)")}
        ${this._entitySelect("Vorheizen", "entity_preheat", "switch")}
        ${this._entitySelect("Warmhalten", "entity_keep_warm", "button")}
        ${this._entitySelect("Warmhaltetemperatur", "entity_warm_temp", "number")}
        ${this._listField("Warmhaltetemperatur Schritte", "warm_temp_steps", c.warm_temp_steps)}
        ${this._entitySelect("Warmhaltedauer", "entity_warm_time", "number")}
        ${this._listField("Warmhaltedauer Schritte", "warm_time_steps", c.warm_time_steps)}
        ${this._entitySelect("Kochmethode", "entity_cook_method", "select")}
      </div>
    `;

    // Einfache Felder
    ["title", "label", "columns", "icon_size", "font_size"].forEach((id) => {
      this.querySelector(`#${id}`)?.addEventListener("change", (e) => {
        const num = ["columns", "icon_size", "font_size"].includes(id);
        this._config = { ...this._config, [id]: num ? parseFloat(e.target.value) : e.target.value };
        this._fireChange();
      });
    });

    // Listen-Felder
    ["temp_steps","temp_presets","time_steps","time_presets","warm_temp_steps","warm_time_steps"].forEach((id) => {
      this.querySelector(`#${id}`)?.addEventListener("change", (e) => {
        const vals = e.target.value.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
        this._config = { ...this._config, [id]: vals };
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
