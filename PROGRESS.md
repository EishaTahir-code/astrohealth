# Orbloom: progress

Orbloom is the astronaut health app described in PRD.md. Every feature in the PRD has a working version,
tested end to end in a real browser. Steps 1 to 8 still have their own branches on GitHub (`step/1-setup` … `step/8-doctor`).

## Round 5 (15 Nov 2026): offline fix, one-line phone menu, ready to submit

Work branch: `claude/great-davinci-gccflf`. **Not merged into `main` yet.**

- **Offline "kept loading" is fixed.** Cause: the app only saved a page for offline use after that page had been
  opened once with internet. On a phone that had only seen the sign-in page, the dashboard was missing offline, so it
  loaded forever. Now the first visit saves the whole app (every page, font and picture), and if a page is ever
  missing, a clear message says what to do instead of loading forever. Signing in on a connection that hangs
  switches to offline sign-in after 8 seconds. Tested on a fresh phone: open the link once, go offline, sign in,
  and the dashboard opens.
- **Phone menu is one line.** The top bar on phones is now a single row you swipe sideways (or drag with a mouse),
  57 pixels tall instead of about 200. "Medical help" stays pinned at the left, and the current page scrolls into
  view. The sign-in and crew garden bars are one line too.
- **No more "demo" anywhere.** The made-up crew is now the **sample crew**:
  - Sample sign-ins: **maya.chen@orbloom.crew** (astronaut) and **dr.rivera@orbloom.crew** (flight surgeon), password
    **orbloom2026** (the same for the whole sample crew).
  - App wording: "reference ranges" instead of "demo ranges", "Automatic reply" on family replies, and so on.
  - Code, database names (`profiles.sample`, `records.sample`, `family_messages.auto_reply`), setup files and docs
    were renamed too. The old sign-ins (@orbloom.demo, demo1234) no longer work.

## Round 4 (14 Nov 2026, night): Supabase accounts and Orbloom on phones

Merged into `main` on 14 Nov 2026. Round 3 (with the old local server) is commit `c839d1e` if you ever need it back.

Your answers: accounts + data + AI on Supabase, a new free Supabase project, flight surgeons sign up with an invite
code, and phones install Orbloom from a link.

### What changed
- **New Supabase project "Orbloom"** (free plan, Sydney region). The old local server (`server/`) is gone: accounts,
  shared health records, family messages and the AI now all live in Supabase. `npm run dev` starts only the app.
- **Sign up, sign in, forgot password** on the first screen ("Sign in" / "Create account" switch):
  - Astronauts sign up with name, email and password. They get their own flower bed in the crew garden right away.
  - Flight surgeons also need the **invite code**. The code is checked inside Supabase and stored only scrambled
    (bcrypt), so it is never in the code or on GitHub. A wrong code says so clearly.
  - "Forgot your password?" emails a reset link; opening it shows "Choose a new password", then signs you in.
- **Privacy rules (Row Level Security)** in the database itself, the same rules the old server had:
  - Astronauts can send only their own records and read only their own (plus everyone's garden status).
  - Flight surgeons read the crew's shareable records, and can only add notes, messages and access-log entries,
    and mark alerts reviewed. Only the review can change; nobody can change who a record belongs to.
  - Check-ins, moods, private notes, greenhouse notes and the encryption key never leave the device.
  - **Sample accounts and real accounts are kept apart**: the sample-crew flight surgeon only sees the made-up crew, and real people
    never see sample data. (The sample passwords are public, so this keeps real health data safe from them.)
- **The crew grows with sign-ups.** The garden, the doctor's crew list, the menu and the alerts all use the people in
  Supabase. Each new astronaut gets the next flower (violet, blue, lily, sun, pink, star, coral, bell, then again).
- **Family** for new astronauts: "Add someone from home" (the sample crew keeps their made-up families). Messages go
  through Supabase; an automatic reply arrives about 20 seconds later (until families have their own app).
- **The AI is a Supabase Edge Function** (`orbloom-ai`). The Groq key is a Supabase secret, never in the app.
  It checks the sign-in and the role, keeps the safety rules (red-flag symptoms skip the AI, no diagnoses), and the
  app falls back to the offline answers if anything is missing.
- **Offline sign-in now works for every account**, not only the sample ones: after one online sign-in on a device,
  the same email and password also work there with no internet. Syncing and the AI resume after "Reconnect".
- **Phones**: every screen was checked at iPhone size (22 screens, no sideways scrolling) and the built app was
  tested as a phone install: it opens with no internet, signs in offline, saves, then syncs after reconnecting.
  New: a GitHub Pages workflow puts Orbloom online at **https://eishatahir-code.github.io/astrohealth/**
  (after the one-time setup below).

### Bugs found and fixed while testing
- On phones, a hidden screen-reader label in the menu made every signed-in page wider than the screen, and the
  first-time guide was cut off. Fixed.
- Two new text boxes (name, invite code) were drawn too small. Fixed.
- A doctor's "Mark reviewed" could be undone by a sync that was running at the same moment. Fixed: a sync never
  overwrites a change that is still waiting to be sent, and something saved during a sync is sent right after it.
- A dropped connection could leave syncing stuck on "Syncing…". Every request now gives up after 20 seconds.

### One-time setup (only you can do these, in your accounts)
1. **AI key**: Supabase → project **Orbloom** → Edge Functions → **Secrets** → add `GROQ_API_KEY` with your Groq key
   (https://supabase.com/dashboard/project/tjvycqynezzwdojzwufu/functions/secrets). Until then the assistant gives
   the pre-written answers and the app says "AI: no key yet".
2. **Let anyone sign up**: Supabase → Authentication → Sign In / Providers → Email → turn off **Confirm email**
   (https://supabase.com/dashboard/project/tjvycqynezzwdojzwufu/auth/providers). Supabase's free email service only
   sends to your own team's addresses and a few emails per hour, so with it on, most people cannot finish signing up.
3. **Password-reset links**: Supabase → Authentication → URL Configuration
   (https://supabase.com/dashboard/project/tjvycqynezzwdojzwufu/auth/url-configuration): set **Site URL** to
   `https://eishatahir-code.github.io/astrohealth/` and add these **Redirect URLs**:
   `https://eishatahir-code.github.io/astrohealth/` and `http://localhost:5173/`.
   Reset emails also use the free email service (your team's addresses only). For real users, add your own email
   sender under Authentication → Emails → SMTP (for example a free Resend account).
4. **Put it online**: on GitHub, open the repository → Settings → Pages → Build and deployment → Source:
   **GitHub Actions**. After the next push to `main`, the Actions tab shows "Deploy Orbloom to GitHub Pages", and the
   app is at https://eishatahir-code.github.io/astrohealth/.

### The flight surgeon invite code
The code was sent to you in the chat (it is not written anywhere in this repository on purpose). To change it,
open Supabase → SQL Editor and run (with your new code in place of NEW-CODE):
```sql
update private.settings
set value = extensions.crypt('NEW-CODE', extensions.gen_salt('bf'))
where key = 'doctor_invite_hash';
```

### Put Orbloom on your phone
1. On the phone, open **https://eishatahir-code.github.io/astrohealth/** (after step 4 above).
2. iPhone (Safari): Share button → **Add to Home Screen**. Android (Chrome): menu ⋮ → **Install app** (or "Add to Home screen").
3. Open Orbloom from the new icon and sign in once while online. After that it opens and signs in with no internet too.
Same features as on a computer: the menu becomes a bar at the top that you swipe sideways.

## Round 3 (14 Nov 2026, evening): your improvement list

Merged into `main` on 14 Nov 2026 (commit `c839d1e`).

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
| Garden beds should grow with the crew; drag to see other beds, no zooming out | The sample crew is now **8 astronauts** (5 new, with accounts and history). The garden is wider than the screen with beds at the same size: **drag sideways** (or swipe, use the ‹ › arrows, the name dots at the bottom, a trackpad or Shift + wheel) to explore, with a gentle glide when you let go. Tabbing to a sign brings its bed into view. Each person has their own flowers. |
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
| Family Space (Phase 5) | Contacts, conversations, photos (shrunk for a slow link), gentle connection prompts, encrypted on the device, queued offline and sent when the ground link opens. A "ground link" indicator shows when messages can go. Settings has a practice switch to pretend the link is down. Until families have their own app, replies are automatic and arrive about 20 seconds later. |
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
- Sample family messages never loaded (two had the same id, so the whole batch was rejected).
- Saving the greenhouse checklist reset the form and hid the confirmation.
- Settings switches lagged behind clicks.
- The server could lose the last change if stopped within 50 ms of saving; it now saves at once and on shutdown.
- An automatic family reply was lost if the server restarted while it was waiting; replies are now stored.
- Doctors could not mark an alert as reviewed (the server wanted the astronaut id again).

## How it was tested (round 4)
- Database rules tested directly against Supabase: an astronaut cannot write or read another astronaut's records,
  cannot write doctor notes or mark alerts reviewed, cannot change their role; doctors can review alerts, add notes,
  messages and access-log entries (with their own name filled in by the database); nobody signed out can read anything;
  unknown fields are dropped; a wrong invite code is refused and the code is never stored with the account.
- Full walkthrough in a real browser against the real Supabase project, **no browser errors**: Maya signs in → check-in
  with a shared note → red blood pressure → alert → assistant (offline answers until the key is added) → medical kit →
  family message and automatic reply → link-down queue → greenhouse → help signal → message to the doctor → alertness game →
  crew garden → Dr. Rivera sees the alerts, marks the help signal reviewed, writes a note and a message, access log →
  Maya sees "Reviewed by Dr. Ana Rivera" and the reply → Leo sees the support alert for Sara.
- New parts: create-account form checks, wrong invite code, sample-account password reset blocked, a real astronaut's garden shows
  only real people, adding a family contact, offline sign-in for a new account (and a clear message for an account
  that never signed in on that device), a real doctor sees only real astronauts, the sample-crew flight surgeon only the sample crew.
- Phone (iPhone 13 size): all 22 screens, astronaut and doctor, no sideways scrolling.
- Built app served from a sub-folder like GitHub Pages, phone size: service worker active, opens offline, offline
  sign-in and saving, Reconnect, then synced.
- `npm run lint`: no warnings. `npm run build`: passes.

## How it was tested (rounds 2 and 3)
- Full walkthrough in a real browser (Playwright), on a clean server, with **no browser errors**: sign in (wrong password, wrong role, right one) → check-in with an encrypted note shared with the doctor → a red blood pressure reading creates a doctor alert → Health AI and Medication AI answer **live from Groq** → kit list search → family message sent, Ava's drawing shown, message queued in "link down" mode and sent when it reopens, automatic reply arrives → greenhouse checklist → help signal received by the doctor → message to the doctor delivered → alertness game → crew garden (names on signs, no details until hover, Sara's card on hover) → pause support alerts → doctor: alerts banner, AI summary (live), mark reviewed, sees only the shared note (never the private one), sends a message and a note, access log → Maya sees the reply and "Reviewed by Dr. Ana Rivera" → Leo sees the support alert for Sara.
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

# every time: start the app
npm run dev
```

Open **http://localhost:5173**. The first screen is the sign-in page. Stop with `Ctrl + C`.
There is no local server any more: the app talks to Supabase directly (the address and the public "publishable" key
are in `client/src/lib/supabase.js`; that key is safe to share because the privacy rules decide what it can do).

Sample accounts (all passwords **orbloom2026**):
- Astronauts: **maya.chen@orbloom.crew**, leo.okafor@orbloom.crew, sara.lindqvist@orbloom.crew, arjun.mehta@orbloom.crew,
  hana.sato@orbloom.crew, tomas.alvarez@orbloom.crew, amara.nwosu@orbloom.crew, elena.petrova@orbloom.crew
- Flight surgeons: **dr.rivera@orbloom.crew**, dr.patel@orbloom.crew

Or make your own account with "Create account". The crew garden opens without signing in.

To start fresh on a device: Settings → "Erase this device" (or delete the `orbloom` IndexedDB in the browser's developer tools).

## How to add the AI key

The key now lives in Supabase, not in a file:
1. Get a free API key at https://console.groq.com (API Keys → Create).
2. Supabase → project **Orbloom** → Edge Functions → **Secrets** → Add new secret: name `GROQ_API_KEY`, value: your key.
   (https://supabase.com/dashboard/project/tjvycqynezzwdojzwufu/functions/secrets)
3. No restart needed. The status line changes to "AI connected". If something is wrong, the Health page says what:
   no key yet, example text, or a key Groq does not accept.

Rules:
- Never put the key in the app's code or in a file starting with `VITE_` (it would be sent to every browser).
- The old `.env.health` file on your computer is not used any more. You can delete it (it is not on GitHub).
- Optional: a secret `GROQ_MODEL` changes the model (default `openai/gpt-oss-120b`, with backups if it is removed).

## Works without internet

These work 100% with no internet (everything is saved on the device first):
sign-in (on a device where that account signed in online once; sample accounts always), Today, daily check-in, health
measurements, graphs, normal ranges and red-flag warnings, the alertness game, the medical kit list, the greenhouse,
the crew garden, settings, and **writing** family messages, messages to the flight surgeon and help signals (they wait
in a queue). The Health assistant gives pre-written answers about your own readings.

These need the ground link (internet): creating an account, resetting a password, live AI answers, actually
**delivering** messages and help signals, receiving family replies and flight-surgeon messages, syncing with the
doctors, and the doctors' AI summary.

## Checking the offline install (PWA)

On the phone: install it as above, open it once online, then turn on airplane mode and open it again.

On a computer (the offline install only works in the built app, not in `npm run dev`):
1. Stop `npm run dev`. Run `npm run build`, then `npm run preview --prefix client`.
2. Open http://localhost:4173 once.
3. Press `F12` → **Application** → **Service workers**: it should say "activated and is running".
   **Application → Manifest** shows the name and icons; Chrome/Edge show an "Install app" icon in the address bar.
4. In **Network**, tick **Offline**, then reload: the app still opens.

## Going back to an earlier version

`main` keeps the last version you approved until you say the new one is OK. Round 3 (with the local server) is
commit `c839d1e`; the version before it is `ff0f5a2`.

## What is still missing or limited

- **Email**: Supabase's free email service only reaches your team's addresses (see the one-time setup). Add your own
  email sender before real people use "Forgot password".
- **Family replies** are pre-written. There is no app for families yet.
- **Encryption**: the key is stored on the same device as the data (the browser keeps it non-copyable). A real version should also lock it with the astronaut's passcode. Family messages are encrypted on the device and travel over HTTPS, but Supabase can read them (not end-to-end).
- **Notifications** appear only while the app is open or in the background (no push yet).
- **Sync** checks every 30 seconds rather than streaming live.
- **Medicine list** comes from a 2015 NASA document (SpX-6). Check it against your mission's current approved list. Red-flag thresholds are general reference values, not mission limits.
- **Not done yet (need people, not code):** user flows, wireframes, success metrics, usability testing, the final presentation (TODO.md Phase 1 and 10).
- **Light mode**: the app is dark by design (the night garden).
- Optional Supabase hardening: turn on "leaked password protection" (Authentication → Passwords) if your plan offers it.

## Problems hit along the way
- The Groq model `llama-3.3-70b-versatile` was retired: fixed with a new default and backups.
- Free Groq plan limit (8,000 tokens per minute): the prompt was trimmed, and the AI retries once.
- Network drops during `npm install` earlier in the project: fixed by retrying.
- Supabase reports a refused sign-up as a "server error", which looked like "no internet": the form now checks the
  invite code first, so it can say exactly what is wrong.

## Project layout

```
client/                    React app (Vite)
  src/pages/               one file per screen (SignIn, Today, CheckIn, Health, Medication (kit list),
                           CareTeam, Family, Greenhouse, Reaction, Emergency, Settings, Garden, Doctor)
  src/components/          Shell (menu, Reconnect bar), Guide, SignInMeadow, GardenScene (the crew garden),
                           HealthAssistantPanel, FlowerBed, Icons, charts, Chat
  src/lib/                 supabase (connection), auth (sign in / sign up / reset), api (AI), sync, connection,
                           secure (encryption), alerts, support (crew garden), family, greenhouse, garden, health,
                           alertness, safety, offline answers, database, seed
  src/data/                crew (sample crew + people who signed up), check-in questions, plants, medicines.json
  src/assets/              fonts and the sign-in artwork
  public/                  favicon, app icons, manifest, service worker (sw.js)
supabase/migrations/       the database: tables, privacy rules, sign-up rules (already applied to the project)
supabase/functions/        orbloom-ai: the AI as a Supabase Edge Function
supabase/sample-accounts.sql how the sample accounts were made
.github/workflows/         deploy-pages.yml: puts the app on GitHub Pages
design/                    design notes and artwork made with the canvas-design skill
.claude/skills/            canvas-design skill (installed with "npx skills add")
```
