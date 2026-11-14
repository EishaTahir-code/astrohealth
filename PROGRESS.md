# Orbloom: progress

Orbloom is the astronaut health app described in PRD.md. Every feature in the PRD now has a working demo version,
tested end to end in a real browser. Steps 1 to 8 still have their own branches on GitHub (`step/1-setup` … `step/8-doctor`).

## Round 3 (14 Nov 2026, evening): your improvement list

Work branch: `claude/great-davinci-gccflf`. **Not merged into `main` yet**: `main` still has the earlier version
(commit `ff0f5a2`) until you say it is OK.

| You asked for | What changed |
|---|---|
| Sign-in flowers should sway with the pointer | The sign-in artwork is now drawn live (`components/SignInMeadow.jsx`): every stem sways in a breeze and bends when the pointer moves through it. Fireflies scatter. Still picture if "reduce motion" is on. |
| Remove the text in the top-left of the image, change the caption colour | The "Nocturne Herbarium" text is gone. "Every crew member tends a bed of light…" is now pale lime, at the top of the artwork. |
| Guide on first sign-in, then at the bottom with Settings | A step-by-step guide (Next / Back / Skip, arrow keys, Esc) opens the first time each account signs in on a device. Afterwards: **Guide** and **Settings** buttons at the bottom of the menu. Separate guides for astronauts and flight surgeons. |
| Show the password | "Show / Hide" button inside the password field. |
| Sign-in top header | A header bar across the top of the sign-in page: logo, connection status and a "Crew garden" button. |
| Ranges for blood pressure (top and bottom) and temperature | The form shows the normal range next to every field (top 90–129, bottom 60–84 mmHg, 36.1–37.5 °C, heart rate, sleep, blood sugar). The blood pressure graph now has a band for the top **and** the bottom number, and every graph says its normal range. |
| Combine Health and the Health assistant | One **Health** page: the measurement form and the assistant side by side, graphs below. No more "AI 1" anywhere. |
| Hovering "Potentially concerning" should lead to the AI | Every yellow or red status (on Health and on Today) shows "Ask the assistant what this means" on hover; clicking asks the assistant about that exact reading. |
| The AI gave the same answer whatever you asked | Two causes, both fixed. 1) The app was really getting pre-written answers (most likely an older copy of the server was still running, or the key was missing or refused), and it did not say why. Now a notice above the chat says exactly why (no key, example text in `.env.health`, key refused by Groq, signed in offline, older server) and how to fix it. 2) The pre-written answers now follow the question: which measurement, "is it normal", "why", "what should I do". |
| Remove AI 2: Medication = kit list only | The Medication AI is gone (page and server route). The tab is now **Medical kit**: search the 95 medicines, crew pack or whole kit, filter by pack. Works fully offline. |
| Garden beds should grow with the crew; drag to see other beds, no zooming out | The demo crew is now **8 astronauts** (5 new, with accounts and history). The garden is wider than the screen with beds at the same size: **drag sideways** (or swipe, use the ‹ › arrows, the name dots at the bottom, a trackpad or Shift + wheel) to explore, with a gentle glide when you let go. Tabbing to a sign brings its bed into view. Each person has their own flowers. |
| How to check the PWA / what works offline | See "Works without internet" and "Checking the offline install" below. |
| Greenhouse crops | Lettuce, Chinese cabbage, mustard greens, kale, tomatoes, radishes and chile peppers (all real ISS crops). |
| Flight surgeon's access log always "Waiting" | Cause: signing in while the app could not reach the server (offline sign-in) never connected syncing. Fix: a **Reconnect** bar appears at the top as soon as the server is reachable; enter your password once and everything syncs (tested: rows change from "Waiting" to "Yes"). |

Also fixed so it cannot happen again: `npm run dev` now refuses to start, with a clear message, if an older copy of
Orbloom is still running (that is what showed you the old version earlier), and the app shows a notice if an older
server answers.

**Tested:** the full browser walkthrough (all screens, both roles, 3 accounts) passes with no errors; the new parts
were tested too: swaying sign-in, guide on first sign-in, show password, ask-the-assistant from a red status,
kit-only Medication, 8-bed garden (drag, arrows, dots, keyboard, hover cards, phone), offline sign-in → Reconnect →
access log synced. **Not tested live:** the AI's own answers this round, because the Groq key saved in my test session
was refused by Groq (it may have been deleted on your Groq account). The AI code itself did not change.

## Earlier on 14 Nov 2026: "fix everything" round

Work branch: `claude/great-davinci-gccflf`, merged into `main`.

### New look: the night garden
- Built from your two references in `main`: `moodboard.png` (orbital navy, teal, leaf green, pale lime) and
  `garden.png` (glowing white wildflowers in darkness). The earlier light "daytime garden" look is replaced.
- Sign-in artwork made with the `canvas-design` skill (installed in `.claude/skills/canvas-design`):
  design notes in `design/night-garden-philosophy.md`, the picture in `design/night-garden-plate-1.png`,
  and the code that draws it in `design/src/night-garden.html`.
- Fonts stored in the app so they work offline: Instrument Serif (headings), Atkinson Hyperlegible Next (text,
  made to be easy to read), DM Mono (small labels like `[ HEALTH / AI 1 ]`).
- Dark by design. Every text colour was checked for contrast (WCAG AA).
- **Crew garden: a forest garden at night** (based on your reference picture with the three stone-ringed beds).
  Each crew member has a round bed edged with stones, a **wooden sign that always shows their name and role**,
  lanterns, moonlight and fireflies. What grows follows their garden stage: seedlings (just planted), drooping dry
  plants (wilting), then more and more flowers (Leo's blue flowers, Sara's white lilies, Maya's violets).
  **Details show only on hover**: hover a bed or its sign (or Tab to the sign, or tap on a phone) and a card says
  how it is doing, for example "In full bloom: a vibrant display of fresh flowers!", plus the gentle support note
  when a bed is wilting. Esc or tapping elsewhere closes it. The plants sway in a light breeze and bend when the
  mouse or a finger moves through them, and the scene shifts slightly with the mouse for depth. With "reduce
  motion" switched on, it stays still. On phones the beds stack in a zig-zag.
  (Code: `client/src/components/GardenScene.jsx`. The earlier meadow version was replaced.)

### Missing features, now built
| Area | What works now |
|---|---|
| Sign-in first | The app opens on the sign-in page. Astronaut or flight surgeon. Then your dashboard. |
| Real sign-in | Passwords are checked by the server against scrambled (scrypt) hashes. The server returns a signed token (JWT) that expires after 12 hours. Every server route checks the role. 8 wrong tries in 5 minutes blocks that email for a while. |
| Offline sign-in | If the server cannot be reached, the app checks the password on the device (PBKDF2), so nobody is locked out in orbit. Sync and AI wait until the next online sign-in. |
| More accounts | Maya, Leo and Sara can each sign in and see their own data. Doctors: Dr. Rivera, Dr. Patel. |
| Encryption | Private check-in notes, family messages and photos, and greenhouse notes are saved encrypted (AES-256) on the device. |
| Sync | Every 30 seconds and right after a change: health readings, alertness tests, alerts, shared notes, flight-surgeon messages and the garden stage. Check-ins and private notes never leave the device. The server only accepts allowed fields and only your own records. Sync status is always shown in the sidebar. |
| Family Space (Phase 5) | Contacts, conversations, photos (shrunk for a slow link), gentle connection prompts, encrypted on the device, queued offline and sent when the ground link opens. A "ground link" indicator shows when messages can go. Settings has a practice switch to pretend the link is down. Family replies are pre-written for the demo and arrive about 20 seconds later. |
| Greenhouse (Phase 6) | Pick from 5 plants really grown on the ISS. Step-by-step guide, daily checklist, water level, light hours, growth stage, photos, harvest reminder and plant-health alerts. A finished checklist gives your crew garden bed +3. |
| Emergency help | A "Get medical help" button on every astronaut screen: choose what is happening, send a red alert to the flight surgeon (queued if there is no link), clear steps to follow while waiting. |
| Doctor alerts | Red readings, large alertness drops and emergency signals become alerts automatically. Doctors see them on an Alerts page and mark them reviewed (with a note). The astronaut sees "Reviewed by Dr. …". |
| Crew support alerts | When a crewmate's bed is wilting, the others see "Sara's garden may need extra support today…" with an "I checked in with Sara" button. Each astronaut can pause (24 h) or turn off alerts about themselves in Settings. |
| Doctor dashboard (Phase 8) | Profile tabs: overview with an **AI summary** for doctors, health trends (including sleep), alertness, alerts, notes (doctor notes + notes the astronaut chose to share) and two-way messages. Check-ins: only the number of days checked in, never moods. New Access log page. |
| Messages with the flight surgeon | "Flight surgeon" page for astronauts, with unread badges. |
| Settings | Support alerts, notifications for new messages, practice "link down" mode, what is shared with whom, and "Erase this device". |
| Real medicine list | `medicines.json` now has the **95 medicines** from the ISS medical kit list PDF in this project (NASA 3.001): strength, route, side effects, comments, pack and storage location. 22 are in the crew self-care pack; the rest are marked "flight surgeon only". The Medication page lists and searches them. |
| Works offline (PWA) | The built app installs like an app and opens with no internet (service worker + manifest + icons). |
| Docs | "OrbitGarden" renamed to Orbloom in PRD.md, TECH.md and TODO.md. TECH.md lists what is actually built. |

### AI fixes (both tabs)
- Groq removed the old model, so both AIs always fell back to offline answers. Now `openai/gpt-oss-120b`, with automatic backup models.
- Medication AI uses the real kit list. Doses copied exactly from the list are allowed; any dose the AI makes up is still blocked.
- The free Groq plan allows about 8,000 tokens per minute (a few questions). If Groq says "wait", the server waits once and retries; if it is still busy, the app shows a clear "AI is busy" message and the offline answer.
- The diagnosis filter no longer blocks normal sentences like "you have 14 readings".
- New: AI summary for doctors (`/api/ai/doctor-summary`), doctor accounts only.

### Bugs found and fixed while testing
- Demo family messages never loaded (two had the same id, so the whole batch was rejected).
- Saving the greenhouse checklist reset the form and hid the confirmation.
- Settings switches lagged behind clicks.
- The server could lose the last change if stopped within 50 ms of saving; it now saves at once and on shutdown.
- A demo family reply was lost if the server restarted while it was waiting; replies are now stored.
- Doctors could not mark an alert as reviewed (the server wanted the astronaut id again).

## How it was tested (14 Nov 2026)
- Full walkthrough in a real browser (Playwright), on a clean server, with **no browser errors**: sign in (wrong password, wrong role, right one) → check-in with an encrypted note shared with the doctor → a red blood pressure reading creates a doctor alert → Health AI and Medication AI answer **live from Groq** → kit list search → family message sent, Ava's drawing shown, message queued in "link down" mode and sent when it reopens, demo reply arrives → greenhouse checklist → help signal received by the doctor → message to the doctor delivered → alertness game → crew garden (names on signs, no details until hover, Sara's card on hover) → pause support alerts → doctor: alerts banner, AI summary (live), mark reviewed, sees only the shared note (never the private one), sends a message and a note, access log → Maya sees the reply and "Reviewed by Dr. Ana Rivera" → Leo sees the support alert for Sara.
- With the server stopped: sign-in works on the device, the Medication tab answers from the local kit list, a help signal is queued.
- Built app: after one visit it opens with **no internet at all**.
- Crew garden: names always visible, no card at rest, cards on bed hover, sign hover, keyboard focus and tap; Esc closes; flowers bend when the mouse sweeps through. Phone size (iPhone 13): no sideways scrolling, beds stacked.
- "Reduce motion": the garden shows one still picture.
- Server checks: wrong password, missing or forged token (401), doctor using an astronaut route (403), an astronaut sending someone else's record (refused), unknown fields dropped.
- Safety filter tests: real diagnoses and invented doses blocked; normal sentences and doses copied from the list allowed.
- `npm run lint`: no warnings. `npm run build`: passes; pages now load in separate files (no "large file" warning).

## How to run the app

You need Node.js.

```bash
# first time, and after pulling these changes: download the packages
npm run setup

# every time: start the server and the app together
npm run dev
```

Open **http://localhost:5173**. The first screen is the sign-in page. Stop with `Ctrl + C`.

Accounts (all passwords **demo1234**):
- Astronauts: **maya.chen@orbloom.demo**, leo.okafor@orbloom.demo, sara.lindqvist@orbloom.demo, arjun.mehta@orbloom.demo,
  hana.sato@orbloom.demo, tomas.alvarez@orbloom.demo, amara.nwosu@orbloom.demo, elena.petrova@orbloom.demo
- Flight surgeons: **dr.rivera@orbloom.demo**, dr.patel@orbloom.demo

The crew garden opens without signing in: "Visit the crew garden without signing in".

To try the offline install: `npm run build`, then `npm run preview --prefix client`, open http://localhost:4173 once, then turn off the internet and reload.

To start fresh: Settings → "Erase this device" (or delete the `orbloom` IndexedDB in the browser's developer tools), and delete `server/data/` to clear the server.

## How to add the AI key

1. Get a free API key at https://console.groq.com (API Keys → Create).
2. Open **`.env.health`** in the project folder and paste it after the `=`:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```
   This turns on the Health assistant and the doctors' AI summary. (`.env.medication` is no longer needed.)
3. No restart needed. The sidebar status changes to "AI connected". If something is wrong, the Health page says
   what: no key yet, still the example text, or a key Groq does not accept.

Rules:
- Never put the key in any other file, and never start its name with `VITE_` (Vite would copy it into the browser).
- `.env`, `.env.*` and `server/data/` are in `.gitignore` and have never been committed.
- Optional: `GROQ_MODEL=some-model-name` changes the model (default `openai/gpt-oss-120b`). If that model is removed, the server switches to a backup by itself.
- Optional: `AUTH_SECRET=…` in `.env` sets the key that signs login tokens. Without it, the server makes a random one in `server/data/`.

## Works without internet

These work 100% with no internet and no server (everything is saved on the device first):
sign-in (on a device that has the app), Today, daily check-in, health measurements, graphs, normal ranges and red-flag
warnings, the alertness game, the medical kit list, the greenhouse, the crew garden, settings, and **writing** family
messages, messages to the flight surgeon and help signals (they wait in a queue). The Health assistant gives
pre-written answers about your own readings.

These need the ground link (internet + the app server): live AI answers, actually **delivering** messages and help
signals, receiving family replies and flight-surgeon messages, syncing with the doctors, and the doctors' AI summary.

## Checking the offline install (PWA)

The offline install only works in the built app, not in `npm run dev`:

1. Stop `npm run dev`. Then run `npm run build`, then `npm run preview --prefix client` (keep the server running in
   another terminal with `npm run start --prefix server` if you also want sign-in and sync).
2. Open http://localhost:4173 once.
3. Press `F12` → **Application** → **Service workers**: it should say "activated and is running".
   **Application → Manifest** shows the name and icons; Chrome/Edge show an "Install app" icon in the address bar.
4. In **Network**, tick **Offline**, then reload: the app still opens.

## Going back to an earlier version

`main` keeps the last version you approved until you say the new one is OK. The version before this round is
commit `ff0f5a2` on GitHub.

## What is still missing or limited

- **Demo accounts** are written in the code (as scrambled hashes). A real mission needs an account database and a way to change passwords.
- **Server storage** is one JSON file. A real mission would use PostgreSQL.
- **Family replies** are pre-written. There is no app for families yet.
- **Encryption**: the key is stored on the same device as the data (the browser keeps it non-copyable). A real version should also lock it with the astronaut's passcode. Family messages are encrypted on the device but not end-to-end: in a real deployment the link must use HTTPS.
- **Notifications** appear only while the app is open or in the background (no server push yet).
- **Sync** checks every 30 seconds rather than streaming live.
- **Medicine list** comes from a 2015 NASA document (SpX-6). Check it against your mission's current approved list. Red-flag thresholds are still demo values.
- **Not done yet (need people, not code):** user flows, wireframes, success metrics, usability testing, demo presentation (TODO.md Phase 1 and 10).
- **Light mode**: the app is dark by design now (the night garden). A light version could be added later.

## Problems hit along the way
- The Groq model `llama-3.3-70b-versatile` was retired: fixed with a new default and backups.
- Free Groq plan limit (8,000 tokens per minute): the medicine prompt was trimmed, and the server retries once.
- Network drops during `npm install` earlier in the project: fixed by retrying.

## Project layout

```
client/                    React app (Vite)
  src/pages/               one file per screen (SignIn, Today, CheckIn, Health, Medication (kit list),
                           CareTeam, Family, Greenhouse, Reaction, Emergency, Settings, Garden, Doctor)
  src/components/          Shell (menu, Reconnect bar), Guide, SignInMeadow, GardenScene (the crew garden),
                           HealthAssistantPanel, FlowerBed, Icons, charts, Chat
  src/lib/                 auth, api, sync, connection, secure (encryption), alerts, support (crew garden),
                           family, greenhouse, garden, health, alertness, safety, offline answers, database, seed
  src/data/                crew, check-in questions, plants, medicines.json (ISS medical kit list)
  src/assets/              fonts and the sign-in artwork
  public/                  favicon, app icons, manifest, service worker (sw.js)
server/                    Express: auth, store (JSON file), sync, family relay, the AI routes, safety filter
server/data/               the server's data and signing key (never committed)
design/                    design notes and artwork made with the canvas-design skill
.claude/skills/            canvas-design skill (installed with "npx skills add")
.env.health                your Groq key (never committed)
```
