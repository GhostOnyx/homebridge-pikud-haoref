# homebridge-pikud-haoref

A [Homebridge](https://homebridge.io) plugin that brings **Israeli Home Front Command (Pikud HaOref)** real-time alerts into Apple HomeKit.

Each alert type for each monitored area appears as a **Motion Sensor** accessory — trigger HomeKit automations, send notifications, or flash smart lights when a rocket alert fires in your area.

## Features

- **Real-time alerts** — polls the official Pikud HaOref API every 3 seconds
- **All alert types** — rockets/missiles, UAV intrusion, earthquake, CBRN, tsunami, hostile infiltration, and more
- **Per-area monitoring** — configure multiple cities/areas, each gets its own accessory
- **Category filtering** — monitor only the alert types you care about
- **Auto-reset** — motion sensor clears automatically after a configurable delay
- **HomeKit automations** — trigger lights, sirens, notifications on any alert
- **Homebridge v1 and v2** compatible

## Installation

```bash
npm install -g homebridge-pikud-haoref
```

Or search for **Pikud HaOref** in the Homebridge UI (Config UI X).

## Configuration

```json
{
  "platform": "PikudHaOref",
  "name": "Home Front Command Alerts",
  "areas": ["תל אביב", "ירושלים"],
  "pollInterval": 3,
  "resetDelay": 30
}
```

### Config Options

| Option | Default | Description |
|--------|---------|-------------|
| `areas` | — | List of city/area names to monitor **(required)**. Use Hebrew names as they appear on the Pikud HaOref website |
| `pollInterval` | `3` | Seconds between API polls. Minimum 2 |
| `resetDelay` | `30` | Seconds to keep sensor triggered after alert clears |
| `categories` | all | Filter by alert category IDs (see below). Leave empty for all |

### Alert Categories

| ID | Type |
|----|------|
| 1 | Rockets / Missiles |
| 2 | UAV / Aircraft Intrusion |
| 3 | Earthquake |
| 4 | Radiological / Chemical / Biological |
| 5 | Tsunami |
| 6 | Hostile Border Crossing |
| 7 | Unconventional Missile |

### Example with category filter (rockets only)

```json
{
  "platform": "PikudHaOref",
  "name": "Home Front Command Alerts",
  "areas": ["תל אביב"],
  "pollInterval": 2,
  "resetDelay": 60,
  "categories": [1, 2]
}
```

## How It Works

The plugin polls the official Pikud HaOref alerts endpoint:
```
https://www.oref.org.il/warningMessages/alert/alerts.json
```

When an alert is active for one of your configured areas, the corresponding HomeKit motion sensor triggers. After the alert clears, the sensor resets after `resetDelay` seconds.

## HomeKit Automations

Because alerts appear as motion sensors you can use them in any HomeKit automation:

- **Flash red lights** when a rocket alert fires
- **Send a notification** to all household members
- **Unlock a safe room door**
- **Turn on a siren** accessory

## Security

| Area | Detail |
|------|--------|
| **Official API only** | Uses the public Pikud HaOref endpoint — no third-party services |
| **No credentials stored** | No account or login required |
| **Read-only** | The plugin only reads alert data, never writes anything |
| **No shell commands** | Pure Node.js, no child processes spawned |
| **axios 1.7.9** | Latest version, no known CVEs |

## Troubleshooting

**Sensor never triggers**
- Verify area names match exactly as shown on [oref.org.il](https://www.oref.org.il) (Hebrew names)
- Check Homebridge logs for API errors

**Too many accessories**
- Use `categories` to filter to only the alert types you need

**Sensor stays on too long**
- Reduce `resetDelay` in config

## License

MIT © [GhostOnyx](https://github.com/GhostOnyx)
