# Orbloom: Task List

## Rules for Claude Code
- Read PRD.md and TECH.md before starting.
- Work on ONE task at a time, in order. Show what changed, then wait.
- I'm a beginner: explain new terms in plain words.
- Follow my coding style.
- API keys only from `.env.health` and `.env.medication`. Never commit them or any keys.
  (Since 14 Nov 2026 the Groq key is the Supabase Edge Function secret `GROQ_API_KEY`, as you chose. Still never committed.)
- Ask before installing anything.
- Branching: each task gets its own branch (e.g. `task/daily-check-in`). Commit and push as you go.
  When the task is finished and I'm happy, merge it into `main` and push. Keep old branches so I can go back.
- After each finished task: tick the task here.
- Follow every rule in PRD.md section 9 (medical safety, privacy, offline).

## Phase 1: Product definition
- [x] Finalize app name and branding
- [x] Define user roles: astronaut, doctor, crew member
- [x] Define offline-first data model
- [x] Define privacy rules
- [x] Define red-flag thresholds
- [x] Define AI assistant boundaries
- [x] Define medication-suggestion safety rules
- [ ] Create user flows for all three interfaces
- [ ] Create wireframes for mobile and doctor dashboard
- [ ] Define success metrics

## Phase 2: Core app setup
- [x] Set up project repository
- [x] Choose tech stack
- [x] Set up local database
- [x] Set up authentication system
- [x] Create astronaut login
- [x] Create doctor login
- [x] Create shared no-login interface
- [x] Implement offline data storage
- [x] Implement background sync when connection is available
- [x] Implement encryption for sensitive data
- [x] Create role-based access control

## Phase 3: Astronaut personal app
- [x] Build daily check-in screen
- [x] Add mood, stress, energy, sleep, workload inputs
- [x] Build physical-health input forms
- [x] Add blood-pressure, heart-rate, temperature, sleep, blood-sugar tracking
- [x] Build trend graphs
- [x] Add color-coded health status
- [x] Add red-flag detection
- [x] Add emergency escalation flow

## Phase 4: Reaction game
- [x] Design reaction-time game
- [x] Build reaction-test screen
- [x] Record reaction time, accuracy, consistency
- [x] Store game results offline
- [x] Build alertness graph
- [x] Detect performance decline
- [x] Add recommendations for low alertness
- [x] Add red-flag escalation for severe decline

## Phase 5: Family messaging
- [x] Build Family Space screen
- [x] Build message composer and inbox
- [x] Store messages locally
- [x] Queue outgoing messages when offline
- [x] Sync messages when connection is available
- [x] Support photos and attachments
- [x] Add message encryption
- [x] Add connection prompts
- [x] Add communication-window indicator

## Phase 6: Greenhouse Reset
- [x] Build plant-selection screen
- [x] Ask astronaut what plant they are growing
- [x] Create plant library
- [x] Add step-by-step growing instructions
- [x] Build daily greenhouse checklist
- [x] Add water-level, light, growth-stage, photo tracking
- [x] Add harvest reminder
- [x] Add plant-health alerts
- [x] Link greenhouse contribution to garden growth and well-being score

## Phase 7: Shared garden
- [x] Build shared garden screen
- [x] Create flower bed for each astronaut
- [x] Start each bed empty
- [x] Link healthy activities to garden growth
- [x] Link poor routines to garden wilting
- [x] Build garden animations and growth stages
- [x] Add color-coded garden status
- [x] Add crew-support alert system
- [x] Ensure alerts include astronaut name
- [x] Ensure alerts do not expose private health details
- [x] Add astronaut control to pause or mute alerts

## Phase 8: Doctor dashboard
- [x] Build doctor login
- [x] Build astronaut list
- [x] Allow doctor to click astronaut name
- [x] Build astronaut profile page
- [x] Display health, sleep, alertness, check-in trends
- [x] Display red-flag alerts and AI summaries
- [x] Add doctor notes and doctor-to-astronaut messaging
- [x] Restrict access to private astronaut content
- [x] Add audit logging for doctor access

## Phase 9: The two AIs
- [x] Set up `.env` with `GROQ_API_KEY` (and second key if using another provider)
- [x] Build AI 1 (Health Trends Assistant): graph explanations
- [x] Add AI 1 question-and-answer chat
- [x] Create `medicines.json` from the approved spacecraft medicine list
- [x] Build AI 2 (Medication Assistant) that answers only from `medicines.json`
- [x] Add offline fallback responses for both AIs
- [x] Add safety filters and medical disclaimers
- [x] Add uncertainty indicators
- [x] Add escalation rules
- [x] Prevent diagnosis claims and unsafe medication advice
- [x] Add doctor-review workflow for serious concerns

## Phase 10: Testing and launch
- [x] Accounts with sign up and password reset (Supabase)
- [x] Works on phones: installable from a link (GitHub Pages), every screen checked at phone size
- [x] Test offline mode and sync behavior
- [x] Test login security and privacy rules
- [x] Test doctor access restrictions
- [x] Test red-flag alerts and AI responses
- [x] Test reaction game, greenhouse flow, family messaging, shared garden
- [ ] Conduct usability testing
- [x] Fix bugs
- [ ] Prepare the final presentation
