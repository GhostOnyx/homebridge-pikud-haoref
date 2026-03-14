# Changelog

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
