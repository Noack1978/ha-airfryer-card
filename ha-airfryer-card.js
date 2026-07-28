/**
 * ha-airfryer-card
 * Lovelace-Karte für Airfryer-Rezepte mit manueller Steuerung.
 */

const DEFAULT_LABEL = "airfryer";
const DEFAULT_BLUEPRINT_PATH = "/config/blueprint/dashboard";

const CONTROLS = [
  { key: "entity_power",        label: "Stromversorgung",       type: "switch",  section: "main" },
  { key: "entity_temp",         label: "Temperatur",            type: "number",  section: "main" },
  { key: "entity_time",         label: "Kochzeit",              type: "number",  section: "main" },
  { key: "entity_start",        label: "Kochen starten",        type: "button",  section: "actions" },
  { key: "entity_pause",        label: "Pause",                 type: "button",  section: "actions" },
  { key: "entity_stop",         label: "Stopp",                 type: "button",  section: "actions" },
  { key: "entity_preheat",      label: "Vorheizen",             type: "switch",  section: "warm" },
  { key: "entity_keep_warm",    label: "Warmhalten",            type: "button",  section: "warm" },
  { key: "entity_warm_temp",    label: "Warmhaltetemperatur",   type: "number",  section: "warm" },
  { key: "entity_warm_time",    label: "Warmhaltedauer",        type: "number",  section: "warm" },
  { key: "entity_cook_method",  label: "Kochmethode",           type: "select",  section: "warm" },
  { key: "entity_presets",      label: "Meine Voreinstellungen",type: "select",  section: "warm" },
  { key: "entity_update",       label: "Rezepte aktualisieren", type: "button",  section: "warm" },
  { key: "entity_remaining",    label: "Restlaufzeit",          type: "sensor",  section: "main" },
];

class HaAiryerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = {};
    this._scripts = [];
    this._initialized = false;
    this._openSelect = null;
    this._overlay = null;
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
    this._callService("number", "set_value", this._config[key], {
      value: Math.min(max, Math.max(min, cur + delta))
    });
  }

  _setNumber(key, val) {
    const st = this._stateOf(key);
    if (!st) return;
    const min = parseFloat(st.attributes.min ?? -Infinity);
    const max = parseFloat(st.attributes.max ?? Infinity);
    this._callService("number", "set_value", this._config[key], {
      value: Math.min(max, Math.max(min, val))
    });
  }

  _hasMain() {
    return ["entity_power","entity_temp","entity_time","entity_start","entity_pause","entity_stop","entity_remaining"]
      .some((k) => this._config[k]);
  }

  _hasWarm() {
    return ["entity_preheat","entity_keep_warm","entity_warm_temp","entity_warm_time",
            "entity_cook_method","entity_presets","entity_update"].some((k) => this._config[k]);
  }

  _numberControl(key, icon, stepCfgKey, presetCfgKey) {
    const st = this._stateOf(key);
    if (!st) return "";
    const val = parseFloat(st.state);
    const unit = st.attributes.unit_of_measurement || "";
    const steps = this._config[stepCfgKey] || [1];
    const presets = presetCfgKey ? (this._config[presetCfgKey] || []) : [];

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

  // Dropdown-Trigger (kein Menü hier, nur der Button)
  _selectTrigger(key, icon) {
    const st = this._stateOf(key);
    if (!st) return "";
    const current = st.state || "";
    return `
      <div class="select-row" id="trigger_${key}">
        <ha-icon icon="${icon}"></ha-icon>
        <div class="sel-trigger" id="sel_${key}" data-key="${key}">
          <span class="sel-current">${current}</span>
          <ha-icon icon="mdi:chevron-down" class="sel-arrow"></ha-icon>
        </div>
      </div>`;
  }

  // Overlay-Dropdown öffnen (angehängt an document.body, über allem)
  _openDropdown(key) {
    this._closeDropdown();

    const st = this._stateOf(key);
    if (!st) return;
    const current = st.state || "";
    const options = st.attributes.options || [];

    const trigger = this.shadowRoot.getElementById(`sel_${key}`);
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();

    // Overlay-Container
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 9999;
    `;

    // Menü
    const menu = document.createElement("div");
    const menuTop = Math.min(rect.bottom + 4, window.innerHeight - 200);
    menu.style.cssText = `
      position: fixed;
      top: ${menuTop}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      background: var(--card-background-color, #1c1c1c);
      border: 1px solid var(--primary-color);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      overflow-y: auto;
      max-height: 220px;
      z-index: 10000;
    `;

    options.forEach((opt) => {
      const item = document.createElement("div");
      item.textContent = opt;
      item.style.cssText = `
        padding: 10px 14px;
        font-size: 0.9em;
        cursor: pointer;
        color: ${opt === current ? "var(--primary-color)" : "var(--primary-text-color, #fff)"};
        font-weight: ${opt === current ? "600" : "normal"};
        background: transparent;
      `;
      item.addEventListener("mouseenter", () => item.style.background = "rgba(255,255,255,0.08)");
      item.addEventListener("mouseleave", () => item.style.background = "transparent");
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this._callService("select", "select_option", this._config[key], { option: opt });
        // Trigger-Text aktualisieren
        const cur = this.shadowRoot.querySelector(`#sel_${key} .sel-current`);
        if (cur) cur.textContent = opt;
        this._closeDropdown();
      });
      menu.appendChild(item);
    });

    overlay.appendChild(menu);
    overlay.addEventListener("click", () => this._closeDropdown());
    document.body.appendChild(overlay);
    this._overlay = overlay;
    this._openSelect = key;
  }

  _closeDropdown() {
    if (this._overlay) {
      document.body.removeChild(this._overlay);
      this._overlay = null;
    }
    this._openSelect = null;
  }

  disconnectedCallback() {
    this._closeDropdown();
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

        .controls-wrapper { display: flex; flex-direction: column; margin-bottom: 12px; }
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

        .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 4px; }
        .toggle-row .row-label { display: flex; align-items: center; gap: 6px; font-size: 0.85em; color: var(--primary-text-color); }
        .toggle-row ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); }
        .toggle { position: relative; width: 42px; height: 24px; flex-shrink: 0; }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; inset: 0; border-radius: 24px; cursor: pointer; background: var(--divider-color, #555); transition: background 0.2s; }
        .toggle-slider::before { content: ""; position: absolute; width: 18px; height: 18px; border-radius: 50%; left: 3px; top: 3px; background: #fff; transition: transform 0.2s; }
        .toggle input:checked + .toggle-slider { background: var(--primary-color); }
        .toggle input:checked + .toggle-slider::before { transform: translateX(18px); }

        .number-control { padding: 6px 4px; }
        .number-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .number-header ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); flex-shrink: 0; }
        .number-val { font-size: 1.3em; font-weight: 600; color: var(--primary-text-color); }
        .step-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .adj-btn {
          flex: 1; min-width: 40px; padding: 5px 4px; border-radius: 8px;
          border: 1px solid var(--primary-color); background: transparent;
          color: var(--primary-color); cursor: pointer; font-size: 0.8em; font-weight: 600;
          transition: background 0.15s, color 0.15s;
        }
        .adj-btn:hover { background: var(--primary-color); color: var(--text-primary-color, #fff); }
        .preset-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
        .preset-btn {
          padding: 5px 10px; border-radius: 8px; border: none;
          background: var(--secondary-background-color);
          color: var(--primary-text-color); cursor: pointer; font-size: 0.8em; font-weight: 600;
          transition: background 0.15s;
        }
        .preset-btn:hover { background: var(--primary-color); color: var(--text-primary-color, #fff); }

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
        .action-btn.update { background: var(--secondary-background-color); color: var(--primary-text-color); flex: none; padding: 8px 14px; flex-direction: row; gap: 6px; border: 1px solid var(--divider-color); }
        .action-btn:hover { opacity: 0.85; }

        /* Restlaufzeit */
        .remaining-row {
          display: flex; align-items: center; gap: 10px; padding: 6px 4px;
        }
        .remaining-row ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); flex-shrink: 0; }
        .remaining-val {
          font-size: 1.6em; font-weight: 700; color: var(--primary-text-color);
          font-variant-numeric: tabular-nums; letter-spacing: 0.02em;
        }
        .remaining-label {
          font-size: 0.75em; color: var(--secondary-text-color);
        }

        /* Select Trigger */
        .select-row { display: flex; align-items: center; gap: 8px; padding: 6px 4px; }
        .select-row > ha-icon { --mdc-icon-size: 18px; color: var(--primary-color); flex-shrink: 0; }
        .sel-trigger {
          flex: 1; display: flex; align-items: center; justify-content: space-between;
          padding: 7px 10px; border-radius: 8px; cursor: pointer;
          border: 1px solid var(--divider-color);
          background: var(--secondary-background-color, #2c2c2c);
          color: var(--primary-text-color); font-size: 0.85em; user-select: none;
        }
        .sel-trigger:hover { border-color: var(--primary-color); }
        .sel-arrow { --mdc-icon-size: 16px; color: var(--secondary-text-color); flex-shrink: 0; }

        .recipe-divider { border: none; border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1)); margin: 0 0 12px; }

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

      if (cfg.entity_remaining) {
        const st = this._stateOf("entity_remaining");
        const secs = parseFloat(st?.state || 0);
        const mins = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        const display = `${mins}:${s.toString().padStart(2, "0")}`;
        html += `
          <div class="remaining-row">
            <ha-icon icon="mdi:timer-sand"></ha-icon>
            <div>
              <div class="remaining-val" id="val_remaining">${display}</div>
              <div class="remaining-label">Restlaufzeit</div>
            </div>
          </div>`;
      }

      const actionBtns = [];
      if (cfg.entity_start) actionBtns.push(`<button class="action-btn start" id="btn_start"><ha-icon icon="mdi:play"></ha-icon>Starten</button>`);
      if (cfg.entity_pause) actionBtns.push(`<button class="action-btn pause" id="btn_pause"><ha-icon icon="mdi:pause"></ha-icon>Pause</button>`);
      if (cfg.entity_stop)  actionBtns.push(`<button class="action-btn stop"  id="btn_stop"><ha-icon icon="mdi:stop"></ha-icon>Stopp</button>`);
      if (actionBtns.length) html += `<div class="action-row">${actionBtns.join("")}</div>`;

      colMain.innerHTML = html;
      this._bindMainEvents(colMain);
    }

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

      const warmBtns = [];
      if (cfg.entity_keep_warm) warmBtns.push(`<button class="action-btn warm" id="btn_keep_warm"><ha-icon icon="mdi:coffee-warm"></ha-icon>Warmhalten</button>`);
      if (cfg.entity_update)    warmBtns.push(`<button class="action-btn update" id="btn_update"><ha-icon icon="mdi:refresh"></ha-icon>Aktualisieren</button>`);
      if (warmBtns.length) html += `<div class="action-row">${warmBtns.join("")}</div>`;

      if (cfg.entity_warm_temp)    html += this._numberControl("entity_warm_temp", "mdi:thermometer-lines", "warm_temp_steps", null);
      if (cfg.entity_warm_time)    html += this._numberControl("entity_warm_time", "mdi:timer-outline", "warm_time_steps", null);
      if (cfg.entity_cook_method)  html += this._selectTrigger("entity_cook_method", "mdi:chef-hat");
      if (cfg.entity_presets)      html += this._selectTrigger("entity_presets", "mdi:bookmark-outline");

      colWarm.innerHTML = html;
      this._bindWarmEvents(colWarm);
    }
  }

  _bindMainEvents(c) {
    const cfg = this._config;

    const tp = c.querySelector("#toggle_power");
    if (tp) tp.addEventListener("change", () =>
      this._callService("switch", tp.checked ? "turn_on" : "turn_off", cfg.entity_power));

    c.querySelectorAll(".adj-btn").forEach((btn) =>
      btn.addEventListener("click", () => this._adjustNumber(btn.dataset.key, parseFloat(btn.dataset.delta))));
    c.querySelectorAll(".preset-btn").forEach((btn) =>
      btn.addEventListener("click", () => this._setNumber(btn.dataset.key, parseFloat(btn.dataset.val))));

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
    const bup = c.querySelector("#btn_update");
    if (bup) bup.addEventListener("click", () => this._callService("button", "press", cfg.entity_update));

    c.querySelectorAll(".adj-btn").forEach((btn) =>
      btn.addEventListener("click", () => this._adjustNumber(btn.dataset.key, parseFloat(btn.dataset.delta))));

    // Select Trigger Events
    ["entity_cook_method", "entity_presets"].forEach((key) => {
      if (!cfg[key]) return;
      const trigger = c.querySelector(`#sel_${key}`);
      if (trigger) {
        trigger.addEventListener("click", (e) => {
          e.stopPropagation();
          if (this._openSelect === key) {
            this._closeDropdown();
          } else {
            this._openDropdown(key);
          }
        });
      }
    });
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

    grid.querySelectorAll(".script-btn").forEach((btn) =>
      btn.addEventListener("click", () =>
        this._hass.callService("script", "turn_on", { entity_id: btn.dataset.entity })));
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
      ${label} <span style="font-size:0.8em;color:var(--secondary-text-color)">(kommagetrennt)</span>
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
        ${this._entitySelect("Restlaufzeit", "entity_remaining", "sensor,number")}
        ${this._section("Warmhalten & Einstellungen (rechts)")}
        ${this._entitySelect("Vorheizen", "entity_preheat", "switch")}
        ${this._entitySelect("Warmhalten", "entity_keep_warm", "button")}
        ${this._entitySelect("Warmhaltetemperatur", "entity_warm_temp", "number")}
        ${this._listField("Warmhaltetemperatur Schritte", "warm_temp_steps", c.warm_temp_steps)}
        ${this._entitySelect("Warmhaltedauer", "entity_warm_time", "number")}
        ${this._listField("Warmhaltedauer Schritte", "warm_time_steps", c.warm_time_steps)}
        ${this._entitySelect("Kochmethode", "entity_cook_method", "select")}
        ${this._entitySelect("Meine Voreinstellungen", "entity_presets", "select")}
        ${this._entitySelect("Rezepte aktualisieren", "entity_update", "button")}
      </div>
    `;

    ["title","label","columns","icon_size","font_size"].forEach((id) => {
      this.querySelector(`#${id}`)?.addEventListener("change", (e) => {
        const num = ["columns","icon_size","font_size"].includes(id);
        this._config = { ...this._config, [id]: num ? parseFloat(e.target.value) : e.target.value };
        this._fireChange();
      });
    });

    ["temp_steps","temp_presets","time_steps","time_presets","warm_temp_steps","warm_time_steps"].forEach((id) => {
      this.querySelector(`#${id}`)?.addEventListener("change", (e) => {
        const vals = e.target.value.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
        this._config = { ...this._config, [id]: vals };
        this._fireChange();
      });
    });

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
