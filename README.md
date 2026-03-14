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

Because alerts appear as motion sensors you can use them in any HomeKit automation. Here are common setups:

---

### Flash lights red on rocket alert

1. Open the **Home** app → tap the **+** → **Add Automation**
2. Choose **A sensor detects something**
3. Select the accessory: **Rockets / Missiles – [your area]**
4. Choose **Detects Motion**
5. Tap **Next** → select your lights → set colour to **Red**, brightness **100%**
6. Tap **Done**

> Add a second automation for **Motion is No Longer Detected** to restore the lights to their original state.

---

### Send a notification to everyone at home

1. **Add Automation** → **A sensor detects something**
2. Select **Rockets / Missiles – [your area]** → **Detects Motion**
3. Tap **Next** → scroll down → tap **Send Notification**
4. Write your message, e.g. *"⚠️ Red Alert — go to safe room now"*
5. Choose who receives it (all home members or specific people)
6. Tap **Done**

> Notifications are delivered instantly to all selected Apple devices even when the Home app is closed.

---

### Turn on a smart siren / alarm

1. **Add Automation** → **A sensor detects something**
2. Select the alert sensor → **Detects Motion**
3. Tap **Next** → select your siren or smart plug powering a siren
4. Set it to **Turn On**
5. Tap **Done**

Add a matching **Motion No Longer Detected** automation to turn it off after `resetDelay` seconds.

---

### Combine multiple alert types

If you want a single automation to trigger on **any** alert type:

1. **Add Automation** → **A sensor detects something**
2. Select the first sensor (e.g. Rockets)
3. After saving, edit the automation → tap **Add Trigger**
4. Add each additional alert sensor (UAV, Earthquake, etc.)
5. The automation fires when **any** of them trigger

---

### Tips

- Set `resetDelay` to at least **90 seconds** — long enough to reach a safe room before lights/notifications reset
- Use **Shortcuts** (the Shortcuts app) for more complex logic, e.g. "only notify between 22:00–06:00 if everyone is asleep"
- Pair with an Apple HomePod or Apple TV as a Home Hub to ensure automations run even when your iPhone is away from home

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
