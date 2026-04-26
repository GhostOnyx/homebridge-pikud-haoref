# Changelog

## [1.2.0] - 2026-04-26

### Changed
- **Smarter accessory count** — without `categories` configured, each area now gets **one combined sensor** ("Alert – [area]") instead of nine. Existing sensors will be replaced on restart; rebuild any HomeKit automations pointing to the old per-category sensors.
- Per-category mode still available: set `categories` to specific IDs and only those sensors are created (previously all 9 were always created even when filtered).
- Default poll interval corrected to **2 seconds** in schema (was incorrectly showing 3).
- Alert categories enum in config UI now includes 7, 10, 13 (were missing); removed phantom 101.
- Log message added when API connectivity is restored after an outage.

### Removed
- `axios` dependency — replaced with Node.js built-in `https`. No behaviour change.

### Fixed
- `HISTORY_URL` constant removed (was defined but never used).
- `Content-Type` header removed from GET requests to oref API.

### Migration note
After upgrading, Homebridge will remove the old per-category sensors and add the new combined sensor(s). Re-create any HomeKit automations that referenced the old sensors.

---

## [1.1.4] - 2026-03-14

### Fixed
- `destroy()` now clears per-accessory `_resetTimer` on Homebridge shutdown, preventing post-shutdown callbacks
- Area matching uses normalized exact-match before falling back to substring, avoiding false positives between similarly-named cities

---

## [1.1.1] - 2026-03-14

### Fixed
- Corrected alert category 13 → **Event Ended** (was incorrectly set to 11)

---

## [1.1.0] - 2026-03-14

### Fixed
- Corrected alert categories: 10 → **Incoming Alerts Expected**, 13 → **Event Ended** (were previously mapped as 14 and 11)

### Changed
- Default poll interval reduced from 3s → **2s** for faster alert detection
- Reduced HTTP request timeout from 5s → 3s to detect API failures sooner

---

## [1.0.1] - 2026-03-14

### Fixed
- README improvements and HomeKit Automations documentation

---

## [1.0.0] - 2026-03-14

### Added
- Initial release
- Real-time Pikud HaOref alert monitoring as HomeKit motion sensors
- Supports alert categories: Rockets/Missiles, UAV, Earthquake, CBRN, Tsunami, Hostile Infiltration, Unconventional Missile, Incoming Alerts Expected, Event Ended
- Configurable areas, poll interval, reset delay, and category filtering
