const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class EPGCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _channelsMap: { type: Object }
    };
  }

  constructor() {
    super();
    this.config = {};
    this._channelsMap = {};
  }

  static get styles() {
    return css`
      :host { display: block; padding: 16px; }
      .section-title {
        margin: 12px 0 0 0;
        font-size: 1.05em;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .channel-mapping { margin-top: 6px; }
      .channel-row { display: flex; align-items: center; margin-bottom: 6px; }
      .channel-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
      .channel-input { width: 60px; margin-left: 8px; padding: 4px 6px; }
      label { font-weight: 600; margin-top: 12px; display: block; }
      .entity-help { font-size: 13px; color: #888; margin-top: 2px; }
      .section-title {
        font-weight: 600;
        font-size: 1.1em;
        margin-bottom: 8px;
        color: var(--primary-text-color);
      }
      .entity-row {
        display: flex;
        align-items: center;
        margin-bottom: 6px;
      }
      .entity-label {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
      }
      .helper-text {
        font-size: 0.9em;
        color: var(--secondary-text-color);
        margin-top: 4px;
        margin-bottom: 12px;
      }
      .timeline-container {
      overflow-x: auto;
      overflow-y: hidden;
      display: flex;
      flex-direction: row;
      -webkit-overflow-scrolling: touch;
      }
    `;
  }

  setConfig(config) {
    this.config = config;
    this._channelsMap = config.channels ? { ...config.channels } : {};
  }

  updated(changedProps) {
    if (changedProps.has('config')) {
      this._channelsMap = this.config.channels ? { ...this.config.channels } : {};
    }
  }

  _valueChanged(ev) {
    const newValue = ev.detail.value;
    this.config = { ...this.config, ...newValue };
    this.dispatchEvent(
      new CustomEvent('config-changed', { detail: { config: this.config } })
    );
  }

  _channelNumberChanged(ev) {
    const entityId = ev.target.dataset.entityId;
    const val = ev.target.value.trim();
    if (val === '') {
      delete this._channelsMap[entityId];
    } else {
      this._channelsMap = { ...this._channelsMap, [entityId]: val };
    }
    this.config = { ...this.config, channels: this._channelsMap };
    this.dispatchEvent(
      new CustomEvent('config-changed', { detail: { config: this.config } })
    );
  }

  // Filter sensors to those with 'epg' integration or 'tv_listings' in the entity_id
  get _filteredEntities() {
    if (!this.hass) return [];
    return Object.entries(this.hass.states)
      .filter(([entityId, state]) =>
        entityId.startsWith('sensor.') &&
        (state?.attributes.integration === 'epg' || entityId.includes('tv_listings'))
      )
      .map(([entityId]) => entityId);
  }

  render() {
    const validEntities = (this.config.entities || []).filter(e => this._filteredEntities.includes(e));
    return html`
      <div class="section-title">EPG Card Setup</div>
      <ha-form
        .hass=${this.hass}
        .data=${this.config}
        .schema=${[
          {
            name: 'row_height',
            label: 'Row Height (pixels)',
            selector: { number: { min: 40, max: 300, unit: 'px' } },
            default: 40,
          },
          {
            name: 'entities',
            label: 'TV Listing Entities',
            selector: { entity: { domain: 'sensor', multiple: true } },
          },
          {
            name: 'enable_channel_clicking',
            label: 'Enable Channel Selection',
            selector: { boolean: {} },
            default: true,
          },
          {
            name: 'harmony_entity_id',
            label: 'Harmony Remote Entity',
            selector: { entity: { domain: 'remote' } },
          },
          {
            name: 'harmony_device_id',
            label: 'Harmony Device ID',
            selector: { text: {} },
          },
          {
            name: 'font_family',
            label: 'Font Family',
            description: 'Choose a font for the card.',
            selector: {
              select: {
                options: [
                  { value: 'Quicksand, sans-serif', label: 'Quicksand (default)' },
                  { value: 'Roboto, sans-serif', label: 'Roboto' },
                  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
                  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
                  { value: 'Arial, sans-serif', label: 'Arial' },
                  { value: 'Georgia, serif', label: 'Georgia' },
                  { value: 'Tahoma, Geneva, sans-serif', label: 'Tahoma/Geneva' },
                  { value: 'Custom', label: 'Custom (enter below)' },
                ]
              }
            },
            default: 'Quicksand, sans-serif'
          },
          {
            name: 'custom_font_family',
            label: 'Custom Font CSS',
            description: 'If above is "Custom", enter a CSS font-family value (e.g. "Comic Sans MS", cursive, sans-serif).',
            selector: { text: {} }
          },
        ]}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <div class="entity-help">
        <em>
          Only sensors integrated with "epg" or containing "tv_listings" in their entity ID work best.<br>
          You can specify manual channel numbers below for each selected entity (optional).
        </em>
      </div>
      <div class="section-title">Manual Channel Numbers per Entity</div>
      <div class="channel-mapping">
        ${validEntities.map(entityId => html`
          <div class="channel-row">
            <div class="channel-label">${entityId}</div>
            <input
              class="channel-input"
              type="text"
              .value=${this._channelsMap[entityId] || ''}
              data-entity-id=${entityId}
              @input=${this._channelNumberChanged}
              placeholder="e.g. 101"
              aria-label="Channel number for ${entityId}"
            />
          </div>
        `)}
      </div>
    `;
  }
}

class EPGCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("epg-card-editor");
  }
  static getStubConfig() {
    return { entities: [], row_height: 40, enable_channel_clicking: true, channels: {}, font_family: 'Quicksand, sans-serif', custom_font_family: '' };
  }
  set hass(hass) {
    this._hass = hass;
    this.renderEPG();
  }
  get hass() {
    return this._hass;
  }
  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities) || config.entities.length === 0) {
      throw new Error("You need to define at least one entity.");
    }
    this.config = config;
  }
  renderEPG() {
    if (!this.hass || !this.config) return;
    if (!this.content) {
      this.content = document.createElement("div");
      this.content.className = "epg-card";
      this.appendChild(this.content);
    }
    const entities = this.config.entities;
    const row_height = this.config.row_height || 40;
    const enable_clicking = this.config.enable_channel_clicking !== false;
    const harmonyEntityId = this.config.harmony_entity_id || "remote.harmony_hub";
    const harmonyDeviceId = this.config.harmony_device_id || "79382863";
    const manualChannels = this.config.channels || {};
    const timelineContainer = document.createElement('div');
    timelineContainer.classList.add('timeline-container');
    // Font logic
    let fontFamily = 'Quicksand, sans-serif';
    if (this.config.font_family === 'Custom' && this.config.custom_font_family && this.config.custom_font_family.trim()) {
      fontFamily = this.config.custom_font_family.trim();
    } else if (this.config.font_family && this.config.font_family !== 'Custom') {
      fontFamily = this.config.font_family;
    }

    const now = new Date();
    const startHour = now.getHours();
    const startMinute = Math.floor(now.getMinutes() / 30) * 30;
    const timelineStart = startHour * 60 + startMinute;
    const windowMinutes = 240;
    const timelineEnd = timelineStart + windowMinutes;
    const timeline = [];
    for (let i = 0; i < 8; i++) {
      const totalMins = timelineStart + i * 30;
      const hour = Math.floor(totalMins / 60) % 24;
      const minute = totalMins % 60;
      const ampm = hour >= 12 ? "PM" : "AM";
      timeline.push(`${hour % 12 || 12}:${minute.toString().padStart(2, "0")} ${ampm}`);
    }
    const epgData = {};
    const channelNameToNum = {};
    entities.forEach((entityId) => {
      const state = this.hass.states[entityId];
      if (!state) return;
      // Use manual channel number if defined, otherwise auto detect
      let channelNum = "";
      if (manualChannels && manualChannels[entityId]) {
        channelNum = manualChannels[entityId];
      } else {
        const friendly = state.attributes.friendly_name || "";
        channelNum = (friendly.match(/^(\d+)/) || [])[1] || "";
      }
      const friendly = state.attributes.friendly_name || "";
      const channelName = friendly
        .replace(/^\d+\s*/, "")
        .replace(/\s*TV Listings\s*$/i, "");
      if (channelName) channelNameToNum[channelName] = channelNum;
      const programs = state.attributes.today || {};
      const channelPrograms = new Map();
      Object.keys(programs).forEach((startTime) => {
        const prog = programs[startTime];
        let startMins = this._toMinutes(prog.start, timelineStart);
        let endMins = this._toMinutes(prog.end, timelineStart);
        if (startMins < timelineStart) startMins = timelineStart;
        if (endMins > timelineEnd) endMins = timelineEnd;
        if (endMins <= timelineStart || startMins >= timelineEnd) return;
        const key = `${prog.start}-${prog.title}`;
        if (!channelPrograms.has(key)) {
          channelPrograms.set(key, {
            title: prog.title,
            desc: prog.desc,
            start: prog.start,
            end: prog.end,
            startMins,
            endMins,
            is_live: prog.is_live || false,
            is_new: prog.is_new || false,
            flags: prog.flags || [],
          });
        }
      });
      const sortedPrograms = Array.from(channelPrograms.values()).sort(
        (a, b) => a.startMins - b.startMins
      );
      epgData[channelName] = sortedPrograms;
    });
    let currentMins = now.getHours() * 60 + now.getMinutes();
    if (currentMins < 6 * 60 && timelineStart > 18 * 60) currentMins += 24 * 60;
    const currentOffset = ((currentMins - timelineStart) / windowMinutes) * 100;
    let htmlText = `
      <style>
        .epg-card {
          font-family: ${fontFamily};
          width: 100%;
          overflow-x: auto;
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--primary-text-color, #fff);
          border-radius: 10px;
          padding: 0px;
          isolation: isolate;
        }
        .timeline {
          display: flex;
          margin-bottom: 8px;
          margin-left: 12%;
          border-bottom: 1px solid var(--divider-color, #444);
        }
        .timeline div {
          flex: 1;
          text-align: center;
          font-weight: 600;
          font-size: 13px;
          padding: 4px 0;
          color: var(--secondary-text-color, #bbb);
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          box-sizing: border-box;
        }
        .timeline div:last-child {
          border-right: none;
        }
        .channel-row {
          display: flex;
          align-items: center;
          margin-bottom: 2px;
          position: relative;
        }
        .channel-name {
          width: 12%;
          height: ${row_height}px;
          display: flex;
          align-items: center;
          padding: 0 8px;
          box-sizing: border-box;
          user-select: none;
          outline: none;
          overflow: hidden;
          ${enable_clicking ? "cursor: pointer;" : "cursor: default;"}
        }
        .channel-logo {
          height: ${Math.max(30, row_height * 0.75)}px;
          width: ${Math.max(30, row_height * 0.75)}px;
          border-radius: 3px;
          box-sizing: border-box;
          object-fit: contain;
          flex-shrink: 0;
        }
        .logo-circle {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(1.5px);
          border: 2px solid rgba(0, 0, 0, 1);
          border-radius: 50%;
          width: ${Math.max(35, row_height * 0.85)}px;
          height: ${Math.max(35, row_height * 0.85)}px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
          margin-right: 6px;
          flex-shrink: 0;
        }
        .channel-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--primary-text-color, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }
        .programs {
          position: relative;
          height: ${row_height}px;
          width: 88%;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          box-sizing: border-box;
        }
        .program {
          position: absolute;
          top: 3px;
          height: calc(100% - 6px);
          background-color: rgba(0, 123, 255, 0.6);
          color: white;
          border-radius: 4px;
          padding: 2px 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
          text-align: center;
          line-height: 1.2;
          word-break: break-word;
          hyphens: auto;
          overflow: hidden;
          z-index: 2;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          box-sizing: border-box;
        }
        .program.live {
          background-color: rgba(255, 0, 0, 0.8) !important;
          border: 2px solid #ff4444 !important;
          animation: live-pulse 2s infinite;
          box-shadow: 0 0 10px rgba(255, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.4);
        }
        .program.live::before {
          content: "🔴 ";
          font-size: 10px;
        }
        .program.new {
          background-color: rgba(0, 255, 0, 0.7) !important;
          border: 2px solid #00ff44 !important;
          box-shadow: 0 0 8px rgba(0, 255, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.4);
        }
        .program.new::before {
          content: "🆕 ";
          font-size: 10px;
        }
        .program.live.new {
          background: linear-gradient(
            45deg,
            rgba(255, 0, 0, 0.8) 0%,
            rgba(0, 255, 0, 0.8) 100%
          ) !important;
          border: 2px solid #ffaa00 !important;
          animation: live-new-pulse 2s infinite;
          box-shadow: 0 0 12px rgba(255, 165, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.4);
        }
        .program.live.new::before {
          content: "🔴🆕 ";
          font-size: 9px;
        }
        @keyframes live-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        @keyframes live-new-pulse {
          0% {
            opacity: 1;
            box-shadow: 0 0 12px rgba(255, 165, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.4);
          }
          50% {
            opacity: 0.9;
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.8), 0 1px 3px rgba(0, 0, 0, 0.4);
          }
          100% {
            opacity: 1;
            box-shadow: 0 0 12px rgba(255, 165, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.4);
          }
        }
        .program.narrow {
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 10px;
          -webkit-line-clamp: 1 !important;
        }
        .program:hover {
          z-index: 3 !important;
          transform: scale(1.02);
          transition: transform 0.2s ease;
        }
        .program.live:hover {
          box-shadow: 0 0 15px rgba(255, 0, 0, 0.8), 0 2px 8px rgba(0, 0, 0, 0.6);
        }
        .program.new:hover {
          box-shadow: 0 0 12px rgba(0, 255, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.6);
        }
        .program.live.new:hover {
          box-shadow: 0 0 20px rgba(255, 165, 0, 1), 0 2px 8px rgba(0, 0, 0, 0.6);
        }
        .current-time-indicator {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background-color: red;
          z-index: 3;
          box-shadow: 0 0 4px red;
          left: ${currentOffset}%;
          transition: left 0.3s ease;
        }
        ${enable_clicking
          ? `
          .channel-name:hover {
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            transition: background-color 0.2s ease;
          }
          .channel-name:hover .logo-circle {
            transform: scale(1.05);
            transition: transform 0.2s ease;
          }
          .channel-name:hover .channel-label {
            color: var(--accent-color, #03a9f4);
            transition: color 0.2s ease;
          }
        `
          : ""}
      </style>
      <div class="epg-card">
        <div class="timeline">${timeline.map((t) => `<div>${t}</div>`).join("")}</div>
    `;
    
    Object.entries(epgData).forEach(([channelName, programs]) => {
      const channelNum = channelNameToNum[channelName] || "";
      htmlText += `
        <div class="channel-row">
          <div class="channel-name" ${enable_clicking ? `data-channel="${channelNum}"` : ""}>
            <div class="logo-circle">
              <img class="channel-logo" src="/local/logo/${channelNum}.png" alt="Logo" />
            </div>
            <div class="channel-label">${channelName}</div>
          </div>
          <div class="programs">
            <div class="current-time-indicator"></div>
      `;
      programs.forEach((program, idx) => {
        const left = ((program.startMins - timelineStart) / windowMinutes) * 100;
        const right = ((program.endMins - timelineStart) / windowMinutes) * 100;
        const width = right - left - 0.5;
        if (right <= 0 || left >= 100 || width <= 0) return;
        const isNarrow = width < 8;
        let displayTitle = program.title;
        let programClasses = `program${isNarrow ? " narrow" : ""}`;
        if (program.is_live) programClasses += " live";
        if (program.is_new) programClasses += " new";
        htmlText += `<div class="${programClasses}" style="left: ${left}%; width: ${width}%; z-index: ${2 + idx}"
                         data-start="${program.start}"
                         data-end="${program.end}"
                         data-title="${program.title.replace(/"/g, "&quot;")}"
                         data-desc="${(program.desc || "").replace(/"/g, "&quot;")}"
                         data-is-live="${program.is_live}"
                         data-is-new="${program.is_new}"
                         data-flags="${JSON.stringify(program.flags).replace(/"/g, "&quot;")}">
          ${displayTitle}
        </div>`;
      });
      htmlText += "</div></div>";
    });
    htmlText += "</div>";
    this.content.innerHTML = htmlText;
    if (enable_clicking) {
      this.content.querySelectorAll(".channel-name").forEach((el) => {
        el.style.cursor = "pointer";
        el.addEventListener("click", () => {
          const channelNum = el.getAttribute("data-channel");
          if (channelNum) this.sendChannelNumber(channelNum);
        });
      });
    }
    this.content.querySelectorAll(".program").forEach((el) => {
      el.addEventListener("click", () => {
        function to12Hour(timeStr) {
          let [h, m] = timeStr.split(":").map(Number);
          const ampm = h >= 12 ? "PM" : "AM";
          if (h > 12) h -= 12;
          if (h === 0) h = 12;
          return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
        }
        const title = el.getAttribute("data-title");
        const desc = el.getAttribute("data-desc");
        const start = to12Hour(el.getAttribute("data-start"));
        const end = to12Hour(el.getAttribute("data-end"));
        const isLive = el.getAttribute("data-is-live") === "true";
        const isNew = el.getAttribute("data-is-new") === "true";
        let statusBadges = "";
        if (isLive)
          statusBadges += `<span style="background: #ff0000; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 5px;">🔴 LIVE</span>`;
        if (isNew)
          statusBadges += `<span style="background: #00aa00; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 5px;">🆕 NEW</span>`;
        const content = `
          <div style="padding: 10px;">
            <div style="margin-bottom: 10px;">${statusBadges}</div>
            <h3 style="margin: 0 0 10px 0; color: var(--primary-text-color);">${title}</h3>
            <div style="margin-bottom: 8px; color: var(--secondary-text-color); font-weight: bold;">${start} - ${end}</div>
            <div style="color: var(--primary-text-color); line-height: 1.4;">${desc || "No description available"}</div>
          </div>
        `;
        this._hass.callService("browser_mod", "popup", {
          title: isLive && isNew
            ? "🔴🆕 Live New Episode"
            : isLive
            ? "🔴 Live Program"
            : isNew
            ? "🆕 New Episode"
            : "Program Info",
          content: content,
          size: "normal",
        });
      });
    });
  }

  _toMinutes(timeStr, startOfDay) {
    const [h, m] = timeStr.split(":").map(Number);
    let mins = h * 60 + m;
    if (mins < startOfDay && startOfDay > 18 * 60) mins += 24 * 60;
    return mins;
  }

  async sendChannelNumber(channelNum) {
    if (!this.hass) return;
    if (!this.config.enable_channel_clicking) return;
    const harmonyEntityId = this.config.harmony_entity_id || "remote.harmony_hub";
    const harmonyDeviceId = this.config.harmony_device_id || "79382863";
    const digits = channelNum.toString().split("");
    for (const digit of digits) {
      await this.hass.callService("remote", "send_command", {
        entity_id: harmonyEntityId,
        device: harmonyDeviceId,
        command: digit,
        num_repeats: 1,
        delay_secs: 0,
        hold_secs: 0,
      });
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    await this.hass.callService("remote", "send_command", {
      entity_id: harmonyEntityId,
      device: harmonyDeviceId,
      command: "SELECT",
      num_repeats: 1,
      delay_secs: 0,
      hold_secs: 0,
    });
  }

  getCardSize() {
    return 5;
  }
}

customElements.define("epg-card-editor", EPGCardEditor);
customElements.define("epg-card", EPGCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "epg-card",
  name: "Enhanced EPG Card",
  preview: false,
  description: "Enhanced EPG Card with Styling, Harmony, Visual Editor, Font selector, and manual channel mapping!",
  documentationURL: "https://github.com/evilpig/lovelace-epg-card",
});
