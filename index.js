'use strict';

const axios = require('axios');

const PLUGIN_NAME = 'homebridge-pikud-haoref';
const PLATFORM_NAME = 'PikudHaOref';

const ALERTS_URL = 'https://www.oref.org.il/warningMessages/alert/alerts.json';
const HISTORY_URL = 'https://alerts-history.oref.org.il/warningMessages/alert/History/AlertsHistory.json';

const OREF_HEADERS = {
  'Referer': 'https://www.oref.org.il/',
  'X-Requested-With': 'XMLHttpRequest',
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

// Alert category IDs → English label shown in HomeKit push notification
const ALERT_CATEGORIES = {
  1:  'Rockets / Missiles',
  2:  'UAV / Aircraft Intrusion',
  3:  'Earthquake',
  4:  'Radiological / CBRN',
  5:  'Tsunami',
  6:  'Hostile Infiltration',
  7:  'Unconventional Missile',
  11: 'Event Ended',
  10: 'Incoming Alerts Expected',
};

module.exports = (api) => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, PikudHaorefPlatform);
};

// ─────────────────────────────────────────────
// Platform
// ─────────────────────────────────────────────

class PikudHaorefPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;

    this.accessories = new Map(); // uuid → PlatformAccessory
    this.handlers    = new Map(); // uuid → PikudHaorefAccessory

    this.areas        = config.areas || [];
    this.pollInterval = (config.pollInterval || 3) * 1000;
    this.resetDelay   = (config.resetDelay || 30) * 1000;
    // null = monitor all; otherwise array of category IDs, e.g. [1, 2]
    this.allowedCats  = config.categories && config.categories.length
      ? config.categories.map(Number)
      : null;

    this._pollTimer = null;
    this._apiOk = true;

    if (!this.areas.length) {
      this.log.warn('[PikudHaOref] No areas configured — add areas in plugin config');
    }

    api.on('didFinishLaunching', () => {
      this._syncAccessories();
      this._startPolling();
    });
  }

  configureAccessory(accessory) {
    this.accessories.set(accessory.UUID, accessory);
  }

  _syncAccessories() {
    const registeredUUIDs = new Set();

    for (const area of this.areas) {
      for (const [catIdStr, label] of Object.entries(ALERT_CATEGORIES)) {
        const catId = Number(catIdStr);
        const uuid  = this.api.hap.uuid.generate(`${PLUGIN_NAME}:${area}:${catId}`);
        registeredUUIDs.add(uuid);

        const displayName = `${label} – ${area}`;

        if (this.accessories.has(uuid)) {
          this.log.info(`[PikudHaOref] Restoring: "${displayName}"`);
          const acc = this.accessories.get(uuid);
          this.handlers.set(uuid, new PikudHaorefAccessory(this, acc, area, catId, label));
        } else {
          this.log.info(`[PikudHaOref] Adding: "${displayName}"`);
          const acc = new this.api.platformAccessory(displayName, uuid);
          this.accessories.set(uuid, acc);
          this.handlers.set(uuid, new PikudHaorefAccessory(this, acc, area, catId, label));
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [acc]);
        }
      }
    }

    // Remove accessories no longer needed
    for (const [uuid, acc] of this.accessories) {
      if (!registeredUUIDs.has(uuid)) {
        this.log.info(`[PikudHaOref] Removing stale: "${acc.displayName}"`);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [acc]);
        this.accessories.delete(uuid);
        this.handlers.delete(uuid);
      }
    }
  }

  _startPolling() {
    this._pollTimer = setInterval(() => this._poll(), this.pollInterval);
    this.log.info(`[PikudHaOref] Polling every ${this.pollInterval / 1000}s`);
  }

  async _poll() {
    try {
      // Returns array of { category: N, label: "...", areas: [...] }
      const activeAlerts = await this._fetchActiveAlerts();
      this._updateAccessories(activeAlerts);
    } catch (err) {
      if (this._apiOk) {
        this.log.warn(`[PikudHaOref] API unreachable: ${err.message}`);
        this._apiOk = false;
      }
    }
  }

  async _fetchActiveAlerts() {
    const res = await axios.get(ALERTS_URL, {
      headers: OREF_HEADERS,
      timeout: 5000,
      transformResponse: [(raw) => {
        const cleaned = (raw || '').replace(/^\uFEFF/, '').trim();
        if (!cleaned) return null;
        try { return JSON.parse(cleaned); } catch (_) { return null; }
      }],
    });

    this._apiOk = true;
    const body = res.data;
    if (!body || !body.data) return [];

    const category = Number(body.cat);
    const label    = ALERT_CATEGORIES[category] || `Alert (cat ${category})`;
    const areas    = Array.isArray(body.data) ? body.data : [body.data];

    // Drop if this category is filtered out by user config
    if (this.allowedCats && !this.allowedCats.includes(category)) return [];

    return [{ category, label, areas }];
  }

  _updateAccessories(activeAlerts) {
    const activeByCat = new Map();
    for (const { category, areas } of activeAlerts) {
      activeByCat.set(category, areas);
    }

    for (const handler of this.handlers.values()) {
      const activeAreas = activeByCat.get(handler.catId) || [];
      const isActive = activeAreas.some((a) =>
        a.toLowerCase().includes(handler.areaName.toLowerCase()) ||
        handler.areaName.toLowerCase().includes(a.toLowerCase())
      );
      handler.setAlert(isActive);
    }
  }

  destroy() {
    if (this._pollTimer) clearInterval(this._pollTimer);
  }
}

// ─────────────────────────────────────────────
// Per-area Accessory — one MotionSensor per category
// ─────────────────────────────────────────────

class PikudHaorefAccessory {
  constructor(platform, accessory, areaName, catId, label) {
    this.platform  = platform;
    this.accessory = accessory;
    this.areaName  = areaName;
    this.catId     = catId;
    this.label     = label;
    this.log       = platform.log;
    this.hap       = platform.api.hap;

    this._active     = false;
    this._resetTimer = null;

    const displayName = `${label} – ${areaName}`;

    // Accessory Information
    const info = accessory.getService(this.hap.Service.AccessoryInformation)
      || accessory.addService(this.hap.Service.AccessoryInformation);
    info
      .setCharacteristic(this.hap.Characteristic.Manufacturer, 'Pikud HaOref')
      .setCharacteristic(this.hap.Characteristic.Model, label)
      .setCharacteristic(this.hap.Characteristic.SerialNumber, `oref-${areaName}-${catId}`);

    // Single MotionSensor — accessory name IS the category, clearly visible in Home app
    this._svc = accessory.getService(this.hap.Service.MotionSensor)
      || accessory.addService(this.hap.Service.MotionSensor, displayName);

    this._svc.setCharacteristic(this.hap.Characteristic.Name, displayName);

    this._svc.getCharacteristic(this.hap.Characteristic.MotionDetected)
      .onGet(() => this._active);
  }

  setAlert(active) {
    if (active && !this._active) {
      this._active = true;
      this.log.warn(`[PikudHaOref] ALERT "${this.areaName}" — ${this.label}`);
      this._svc.updateCharacteristic(this.hap.Characteristic.MotionDetected, true);

      if (this._resetTimer) {
        clearTimeout(this._resetTimer);
        this._resetTimer = null;
      }
    } else if (!active && this._active) {
      if (!this._resetTimer) {
        this._resetTimer = setTimeout(() => {
          this._active     = false;
          this._resetTimer = null;
          this.log.info(`[PikudHaOref] Cleared "${this.areaName}" — ${this.label}`);
          this._svc.updateCharacteristic(this.hap.Characteristic.MotionDetected, false);
        }, this.platform.resetDelay);
      }
    }
  }
}
