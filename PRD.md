# OrbitGarden: Product Requirements Document (PRD)

An offline-first astronaut health, well-being, and crew-support companion.

## 1. Problem
Long-duration space missions expose astronauts to isolation, confinement, disrupted sleep, high workload, communication delays, and physical-health risks. Astronauts need a private, reliable way to monitor their physical and mental well-being, stay connected with family, maintain alertness, and get medical support, even with no internet.

## 2. Goal
Build an offline-capable mobile and web app that helps astronauts monitor health trends, understand their data through AI explanations, check alertness, stay connected with family, build routines through plant care, support crewmates through a shared digital garden, and let doctors respond to red-flag alerts.

## 3. Users
| User | Purpose |
|---|---|
| Astronaut | Tracks personal health, mental well-being, family messages, alertness, greenhouse care |
| Doctor / flight surgeon | Reviews astronaut health trends and responds to red-flag alerts |
| Crew member | Views the shared garden and receives supportive alerts about teammates |
| Mission control | Optional future role for asynchronous review |

## 4. Key principles
- **Offline-first:** every core feature works without internet.
- **Privacy-first:** health, mood, messages and journal data are private by default.
- **Supportive, not diagnostic:** gives insights and recommendations, never replaces medical professionals.
- **Crew-care oriented:** encourages support and connection, not competition or shaming.
- **Simple and calm:** low cognitive load during high-stress periods.
- **Secure:** health data, messages and doctor access are protected.

## 5. Interfaces and access
| Interface | Login | Who | What they can see |
|---|---|---|---|
| Shared crew garden | No | All crew | Shared garden, each astronaut's flower-bed status, general support alerts |
| Astronaut personal app | Yes | One astronaut | Personal health graphs, AI insights, medication suggestions, reaction results, family messages, greenhouse |
| Doctor dashboard | Yes | Doctors / flight surgeons | Astronaut names, health trends, red-flag alerts, AI summaries, shared notes. No private journals, family messages or detailed mood reflections |

## 6. Features

### 6.1 Shared crew garden
Visible without login. Each astronaut has their own flower bed that starts empty. Healthy activity makes it grow; poor sleep, high stress, missed check-ins or concerning trends make it look wilted. It shows overall well-being, not a diagnosis.

### 6.2 Crew-support alert
If an astronaut may need support, selected crew members' apps get an alert with the astronaut's name, e.g.:
> "Maria's garden may need extra support today. Consider checking in with Maria or offering help."

It must NOT reveal the health issue, mood score, journal, family message or diagnosis, and never label anyone as depressed, mentally ill or failing. The astronaut can pause or mute these alerts.

### 6.3 Daily check-in
Short daily check-in: mood, stress, energy, sleep quality, perceived workload, loneliness/social connection, physical symptoms, optional reflections. Feeds personal trends, garden growth, doctor-visible red flags and recommendations.

### 6.4 Physical-health monitoring
Manual entry or sync of approved measurements: blood pressure, heart rate, body temperature, sleep duration and quality, blood sugar, other mission-approved indicators. Shows current values, personal baselines, trends, color-coded status, AI explanations and next steps.

### 6.5 AI assistants (two AIs)
OrbitGarden uses **two separate AIs**, each in its own tab. Details are in TECH.md.
- **AI 1: Health Trends Assistant.** Explains graphs in simple language, answers questions like "What does this blood-pressure trend mean?", gives general self-care suggestions and a doctor-ready summary.
- **AI 2: Medication Assistant.** Knows the specific medicines astronauts are provided in their spacecraft (from an approved medicine list). Answers only from that list.

Both AIs must never diagnose, claim certainty with limited data, replace a doctor, give dangerous medication instructions, or encourage ignoring red-flag symptoms.

### 6.6 Reaction-time and alertness game
Short reaction tests measuring speed, accuracy, consistency and change over time. Builds an alertness graph and may recommend rest, hydration, nutrition, movement, reduced workload, avoiding high-risk tasks, notifying the crew lead, or contacting medical support if performance drops severely.

### 6.7 Family messages
Send and receive messages from family. Messages written offline are stored locally and queued until a communication window opens. Incoming messages, photos and updates appear in a private Family Space. Gentle connection prompts, no pressure.

### 6.8 Greenhouse Reset
Astronaut picks the plant they are growing. If not started: step-by-step instructions (materials, planting, water, light, monitoring, harvest timing, plant-health guidance). If already growing: daily checklist for watering, inspection, photos, growth stage, adjustments, harvesting.

### 6.9 Doctor dashboard
Doctors log in, see a list of astronaut names, click one to view health trends any time (blood pressure, heart rate, temperature, sleep, alertness, others). They see red-flag alerts, AI summaries and astronaut-selected shared notes. They do not automatically see private journals, family messages or detailed mood reflections.

## 7. Red-flag system
| Status | Meaning | Action |
|---|---|---|
| Green | Stable | Continue normal routine |
| Yellow | Needs attention | Monitor, adjust routine, repeat measurement |
| Red | Potentially concerning | Notify doctor, reduce high-risk tasks, follow escalation protocol |

Triggers: abnormal blood pressure, heart rate or temperature; severe sleep disruption; major reaction-time decline; repeated high stress or low mood; concerning symptoms; user-selected emergency signals.

## 8. Privacy model
- **Private by default:** journal entries, family messages, detailed mood reflections, exact mental-health scores, private greenhouse notes, medication questions.
- **Shared only with consent:** specific health readings, symptoms, trends, emergency alerts, doctor-visible notes.
- **Doctor access:** health graphs, red-flag alerts, AI summaries, trends, astronaut-selected shared notes. Nothing private unless explicitly shared.
- **Crew access:** shared garden and general support alerts only. No exact readings, mood scores, messages, journals or diagnoses.

## 9. Rules and guardrails

**Medical safety**
- Health-support tool, not a diagnostic device.
- AI must not diagnose, must not replace a doctor, flight surgeon or emergency response.
- AI must explain uncertainty and recommend medical escalation for red-flag readings.
- Medication suggestions are conservative and based only on approved protocols and the approved medicine list.
- Never encourage ignoring symptoms. Never give dangerous medication instructions.
- Always show a disclaimer: this does not replace professional medical care.

**Privacy**
- Health, mood, journal and family-message data private by default.
- Doctors see trends, not private journals. Crew see garden status, not health data.
- Crew alerts include the astronaut's name but not the reason.
- All sensitive data encrypted. Doctor access is logged.

**Offline**
- All core features work offline; health data stored locally; messages queued locally; garden updates work offline.
- AI has an offline fallback.
- Sync only on a secure connection; sync status always visible.
- No feature may depend on constant internet.

**Crew support**
- Alerts are supportive, never judgmental; include the name; never reveal private details; never label someone mentally ill.
- Optional and controllable by the astronaut; encourage check-ins, not diagnosis; no public shaming; protect dignity.

**AI**
- Explain trends in simple language; answer clearly; no definitive diagnoses.
- Show confidence levels when appropriate; recommend escalation for red flags.
- No unsafe medication advice; respect privacy; work offline or give a safe offline fallback.

## 10. Success metrics
Daily check-in completion, early red-flag detection, sleep consistency, reaction-time performance, family-message activity, greenhouse-task completion, crew-support check-ins, doctor response time, AI satisfaction, offline reliability.

## 11. One-line summary
OrbitGarden is an offline-first, privacy-preserving astronaut health platform with a shared crew garden, a personal astronaut app for physical and mental well-being, and a secure doctor dashboard for monitoring trends and responding to red-flag alerts.
