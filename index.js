'use strict';

const https = require('https');

const PLUGIN_NAME = 'homebridge-pikud-haoref';
const PLATFORM_NAME = 'PikudHaOref';

const ALERTS_URL = 'https://www.oref.org.il/warningMessages/alert/alerts.json';

const OREF_HEADERS = {
  'Referer': 'https://www.oref.org.il/',
  'X-Requested-With': 'XMLHttpRequest',
  'Accept': 'application/json',
};

const ALERT_CATEGORIES = {
  1:  'Rockets / Missiles',
  2:  'UAV / Aircraft Intrusion',
  3:  'Earthquake',
  4:  'Radiological / CBRN',
  5:  'Tsunami',
  6:  'Hostile Infiltration',
  7:  'Unconventional Missile',
  10: 'Incoming Alerts Expected',
  13: 'Event Ended',
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
    this.pollInterval = (config.pollInterval || 2) * 1000;
    this.resetDelay   = (config.resetDelay   || 30) * 1000;

    // Non-empty categories array → per-category mode (one sensor per category per area).
    // Empty / absent               → single-sensor mode (one combined sensor per area).
    this.configuredCats = config.categories && config.categories.length
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
      if (this.configuredCats) {
        // Per-category mode — one sensor per configured category
        for (const catId of this.configuredCats) {
          const label = ALERT_CATEGORIES[catId] || `Alert (cat ${catId})`;
          const uuid  = this.api.hap.uuid.generate(`${PLUGIN_NAME}:${area}:${catId}`);
          registeredUUIDs.add(uuid);
          this._ensureAccessory(uuid, `${label} – ${area}`, area, catId, label);
        }
      } else {
        // Single-sensor mode — one combined sensor per area
        const uuid = this.api.hap.uuid.generate(`${PLUGIN_NAME}:${area}:any`);
        registeredUUIDs.add(uuid);
        this._ensureAccessory(uuid, `Alert – ${area}`, area, null, 'Alert');
      }
    }

    // Remove accessories that are no longer needed
    for (const [uuid, acc] of this.accessories) {
      if (!registeredUUIDs.has(uuid)) {
        this.log.info(`[PikudHaOref] Removing stale: "${acc.displayName}"`);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [acc]);
        this.accessories.delete(uuid);
        this.handlers.delete(uuid);
      }
    }
  }

  _ensureAccessory(uuid, displayName, area, catId, label) {
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

  _startPolling() {
    this._pollTimer = setInterval(() => this._poll(), this.pollInterval);
    this.log.info(`[PikudHaOref] Polling every ${this.pollInterval / 1000}s`);
  }

  async _poll() {
    try {
      const activeAlerts = await this._fetchActiveAlerts();
      if (!this._apiOk) {
        this.log.info('[PikudHaOref] API connection restored');
        this._apiOk = true;
      }
      this._updateAccessories(activeAlerts);
    } catch (err) {
      if (this._apiOk) {
        this.log.warn(`[PikudHaOref] API unreachable: ${err.message}`);
        this._apiOk = false;
      }
    }
  }

  _fetchActiveAlerts() {
    return new Promise((resolve, reject) => {
      const parsed = new URL(ALERTS_URL);
      const req = https.request(
        { hostname: parsed.hostname, path: parsed.pathname + parsed.search, headers: OREF_HEADERS, timeout: 3000 },
        (res) => {
          let raw = '';
          res.on('data', c => raw += c);
          res.on('end', () => {
            const cleaned = raw.replace(/^﻿/, '').trim();
            if (!cleaned) { resolve([]); return; }
            let body;
            try { body = JSON.parse(cleaned); } catch { resolve([]); return; }
            if (!body || !body.data) { resolve([]); return; }

            const category = Number(body.cat);
            const label    = ALERT_CATEGORIES[category] || `Alert (cat ${category})`;
            const areas    = Array.isArray(body.data) ? body.data : [body.data];
            resolve([{ category, label, areas }]);
          });
        }
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      req.end();
    });
  }

  _updateAccessories(activeAlerts) {
    // Build map: catId → areas[]
    const activeCats = new Map();
    for (const { category, areas } of activeAlerts) {
      activeCats.set(category, areas);
    }

    for (const handler of this.handlers.values()) {
      let isActive = false;
      let activeLabel = null;

      if (handler.catId === null) {
        // Single-sensor mode: fire on any matching category
        for (const [cat, areas] of activeCats) {
          if (this._areaMatches(handler.areaName, areas)) {
            isActive = true;
            activeLabel = ALERT_CATEGORIES[cat] || `Alert (cat ${cat})`;
            break;
          }
        }
      } else {
        // Per-category mode
        const areas = activeCats.get(handler.catId) || [];
        isActive = this._areaMatches(handler.areaName, areas);
      }

      handler.setAlert(isActive, activeLabel);
    }
  }

  _areaMatches(areaName, activeAreas) {
    const normalize = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const needle = normalize(areaName);
    return activeAreas.some((a) => {
      const hay = normalize(a);
      return hay === needle || hay.includes(needle) || needle.includes(hay);
    });
  }

  destroy() {
    if (this._pollTimer) clearInterval(this._pollTimer);
    for (const handler of this.handlers.values()) {
      handler.destroy();
    }
  }
}

// ─────────────────────────────────────────────
// Per-area Accessory
// ─────────────────────────────────────────────

class PikudHaorefAccessory {
  constructor(platform, accessory, areaName, catId, label) {
    this.platform  = platform;
    this.accessory = accessory;
    this.areaName  = areaName;
    this.catId     = catId;   // null = any alert (single-sensor mode)
    this.label     = label;
    this.log       = platform.log;
    this.hap       = platform.api.hap;

    this._active     = false;
    this._resetTimer = null;

    const displayName = catId !== null ? `${label} – ${areaName}` : `Alert – ${areaName}`;

    const info = accessory.getService(this.hap.Service.AccessoryInformation)
      || accessory.addService(this.hap.Service.AccessoryInformation);
    info
      .setCharacteristic(this.hap.Characteristic.Manufacturer, 'Pikud HaOref')
      .setCharacteristic(this.hap.Characteristic.Model, label)
      .setCharacteristic(this.hap.Characteristic.SerialNumber, `oref-${areaName}-${catId ?? 'any'}`);

    this._svc = accessory.getService(this.hap.Service.MotionSensor)
      || accessory.addService(this.hap.Service.MotionSensor, displayName);

    this._svc.setCharacteristic(this.hap.Characteristic.Name, displayName);
    this._svc.getCharacteristic(this.hap.Characteristic.MotionDetected)
      .onGet(() => this._active);
  }

  destroy() {
    if (this._resetTimer) {
      clearTimeout(this._resetTimer);
      this._resetTimer = null;
    }
  }

  setAlert(active, alertLabel = null) {
    if (active && !this._active) {
      this._active = true;
      const label = this.catId !== null ? this.label : (alertLabel || 'Unknown');
      this.log.warn(`[PikudHaOref] ALERT "${this.areaName}" — ${label}`);
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
