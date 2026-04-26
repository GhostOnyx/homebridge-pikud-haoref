# homebridge-pikud-haoref

A [Homebridge](https://homebridge.io) plugin that brings **Israeli Home Front Command (Pikud HaOref)** real-time alerts into Apple HomeKit.

Each monitored area appears as a **Motion Sensor** accessory — trigger HomeKit automations, send notifications, or flash smart lights the moment an alert fires in your area.

## Features

- **Real-time alerts** — polls the official Pikud HaOref API every 2 seconds
- **All alert types** — rockets/missiles, UAV intrusion, earthquake, CBRN, tsunami, hostile infiltration, and more
- **Per-area monitoring** — configure multiple cities/areas, each gets its own sensor
- **Simple by default** — one combined sensor per area; add `categories` for per-type sensors
- **Auto-reset** — sensor clears automatically after a configurable delay
- **No dependencies** — pure Node.js, no npm runtime packages
- **Homebridge v1 and v2** compatible

## Installation

```bash
npm install -g homebridge-pikud-haoref
```

Or search for **Pikud HaOref** in the Homebridge UI (Config UI X).

## Configuration

### Default (one sensor per area)

Without `categories` configured, each area gets **one combined sensor** that triggers on any alert type. This is the simplest setup and works well for most users.

```json
{
  "platform": "PikudHaOref",
  "name": "Home Front Command Alerts",
  "areas": ["תל אביב", "ירושלים"]
}
```

HomeKit will show: **Alert – תל אביב**, **Alert – ירושלים**

### Per-category sensors

Add `categories` to get one sensor per alert type per area. Only the listed categories are created — not all nine.

```json
{
  "platform": "PikudHaOref",
  "name": "Home Front Command Alerts",
  "areas": ["תל אביב"],
  "categories": [1, 2]
}
```

HomeKit will show: **Rockets / Missiles – תל אביב**, **UAV / Aircraft Intrusion – תל אביב**

### All config options

| Option | Default | Description |
|--------|---------|-------------|
| `areas` | — | Hebrew city/area names to monitor **(required)**. Use names as shown on [oref.org.il](https://www.oref.org.il) |
| `pollInterval` | `2` | Seconds between API polls. Minimum 2 |
| `resetDelay` | `30` | Seconds to keep sensor triggered after an alert clears |
| `categories` | — | Leave empty for one combined sensor per area. Set to specific IDs for per-type sensors (see table below) |

### Alert category IDs

| ID | Type |
|----|------|
| 1 | Rockets / Missiles |
| 2 | UAV / Aircraft Intrusion |
| 3 | Earthquake |
| 4 | Radiological / CBRN |
| 5 | Tsunami |
| 6 | Hostile Infiltration |
| 7 | Unconventional Missile |
| 10 | Incoming Alerts Expected |
| 13 | Event Ended |

## How It Works

The plugin polls the official Pikud HaOref endpoint every `pollInterval` seconds:

```
https://www.oref.org.il/warningMessages/alert/alerts.json
```

When an alert is active for one of your configured areas, the HomeKit motion sensor triggers. After the alert clears, the sensor resets after `resetDelay` seconds.

Area matching is normalised — whitespace and case differences are ignored, and partial matches are supported so that abbreviated names still work.

## HomeKit Automations

Because alerts appear as motion sensors you can use them in any HomeKit automation.

---

### Flash lights red on alert

1. Open the **Home** app → tap **+** → **Add Automation**
2. Choose **A sensor detects something**
3. Select **Alert – [your area]** → **Detects Motion**
4. Tap **Next** → select your lights → set colour to **Red**, brightness **100%**
5. Tap **Done**

Add a second automation for **Motion is No Longer Detected** to restore the lights.

---

### Send a notification on alert

> Apple removed the "Send Notification" action from HomeKit in iOS 16. Use the Shortcuts app instead.

1. Open **Shortcuts** → **Automation** tab → **+** → **New Automation**
2. Choose **Home** → **A sensor detects something**
3. Select **Alert – [your area]** → **Detects Motion** → tap **Next**
4. **New Blank Automation** → **Add Action** → search **Send Notification**
5. Write your message, e.g. *"⚠️ Red Alert — go to safe room now"*
6. Disable **Ask Before Running** → **Done**

> Shortcuts notifications go to the device where the shortcut is saved. For family-wide alerts, each person creates the automation on their own device.

---

### Turn on a smart siren

1. **Add Automation** → **A sensor detects something**
2. Select **Alert – [your area]** → **Detects Motion**
3. Tap **Next** → select your siren or smart plug → **Turn On**
4. Add a matching **Motion No Longer Detected** automation to turn it off

---

### Tips

- Set `resetDelay` to at least **90 seconds** — long enough to reach a safe room before automations reset
- Use the **Shortcuts** app for conditional logic, e.g. "only alert between 22:00–06:00"
- Pair with an Apple HomePod or Apple TV as a Home Hub so automations run when your iPhone is away

## Upgrading from v1.1.x

v1.2.0 changes how accessories are created. **Homebridge will remove old sensors and add new ones on the first restart.** Rebuild any HomeKit automations that referenced the old per-category sensors (e.g. "Rockets / Missiles – תל אביב") — they now need to point to the new combined sensor ("Alert – תל אביב"), unless you add `categories` to your config to restore per-type sensors.

## Security

| Area | Detail |
|------|--------|
| **Official API only** | Uses the public Pikud HaOref endpoint — no third-party services |
| **No credentials** | No account or login required |
| **Read-only** | The plugin only reads alert data, never writes anything |
| **No dependencies** | Pure Node.js built-ins only — no npm runtime packages, zero supply-chain risk |
| **No shell commands** | No child processes spawned |

## Troubleshooting

**Sensor never triggers**
- Verify area names are in Hebrew as shown on [oref.org.il](https://www.oref.org.il)
- Check Homebridge logs — API errors are logged as warnings

**Sensor stays on too long**
- Reduce `resetDelay` in config (minimum 5 seconds)

**Sensor resets too quickly**
- Increase `resetDelay` — 90 seconds is recommended for time-critical automations

**Old sensors still showing after upgrade**
- Remove them manually from the Home app if they persist after a Homebridge restart

## Changelog

### v1.2.0
- Default mode is now one combined "Alert – [area]" sensor per area — no more nine sensors per area
- Per-category mode available by setting `categories` in config — only configured categories are created
- Removed `axios` dependency — uses Node.js built-in `https`
- Node.js minimum version updated to v20 (Node 18 is EOL)
- Fixed `categories` enum in config UI (added 7, 10, 13; removed phantom 101)
- API restoration is now logged when connectivity returns after an outage

### v1.1.4
- `destroy()` now clears per-accessory timers on shutdown
- Area matching normalised to exact match before substring, preventing false positives between similarly-named cities

### v1.1.0 – v1.1.3
- Fixed alert category mappings (10 = Incoming Alerts Expected, 13 = Event Ended)
- Default poll interval reduced from 3s to 2s

### v1.0.0
- Initial release

## License

MIT © [GhostOnyx](https://github.com/GhostOnyx)
