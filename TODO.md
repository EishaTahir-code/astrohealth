# OrbitGarden: Task List

## Rules for Claude Code
- Read PRD.md and TECH.md before starting.
- Work on ONE task at a time, in order. Show what changed, then wait.
- I'm a beginner: explain new terms in plain words.
- Follow my coding style.
- API keys only from `.env.health` and `.env.medication`. Never commit them or any keys.
- Ask before installing anything.
- Branching: each task gets its own branch (e.g. `task/daily-check-in`). Commit and push as you go.
  When the task is finished and I'm happy, merge it into `main` and push. Keep old branches so I can go back.
- After each finished task: tick the task here.
- Follow every rule in PRD.md section 9 (medical safety, privacy, offline).

## Phase 1: Product definition
- [ ] Finalize app name and branding
- [ ] Define user roles: astronaut, doctor, crew member
- [ ] Define offline-first data model
- [ ] Define privacy rules
- [ ] Define red-flag thresholds
- [ ] Define AI assistant boundaries
- [ ] Define medication-suggestion safety rules
- [ ] Create user flows for all three interfaces
- [ ] Create wireframes for mobile and doctor dashboard
- [ ] Define success metrics

## Phase 2: Core app setup
- [x] Set up project repository
- [x] Choose tech stack
- [x] Set up local database
- [ ] Set up authentication system
- [ ] Create astronaut login
- [ ] Create doctor login
- [ ] Create shared no-login interface
- [ ] Implement offline data storage
- [ ] Implement background sync when connection is available
- [ ] Implement encryption for sensitive data
- [ ] Create role-based access control

## Phase 3: Astronaut personal app
- [x] Build daily check-in screen
- [x] Add mood, stress, energy, sleep, workload inputs
- [ ] Build physical-health input forms
- [ ] Add blood-pressure, heart-rate, temperature, sleep, blood-sugar tracking
- [ ] Build trend graphs
- [ ] Add color-coded health status
- [ ] Add red-flag detection
- [ ] Add emergency escalation flow

## Phase 4: Reaction game
- [ ] Design reaction-time game
- [ ] Build reaction-test screen
- [ ] Record reaction time, accuracy, consistency
- [ ] Store game results offline
- [ ] Build alertness graph
- [ ] Detect performance decline
- [ ] Add recommendations for low alertness
- [ ] Add red-flag escalation for severe decline

## Phase 5: Family messaging
- [ ] Build Family Space screen
- [ ] Build message composer and inbox
- [ ] Store messages locally
- [ ] Queue outgoing messages when offline
- [ ] Sync messages when connection is available
- [ ] Support photos and attachments
- [ ] Add message encryption
- [ ] Add connection prompts
- [ ] Add communication-window indicator

## Phase 6: Greenhouse Reset
- [ ] Build plant-selection screen
- [ ] Ask astronaut what plant they are growing
- [ ] Create plant library
- [ ] Add step-by-step growing instructions
- [ ] Build daily greenhouse checklist
- [ ] Add water-level, light, growth-stage, photo tracking
- [ ] Add harvest reminder
- [ ] Add plant-health alerts
- [ ] Link greenhouse contribution to garden growth and well-being score

## Phase 7: Shared garden
- [ ] Build shared garden screen
- [ ] Create flower bed for each astronaut
- [ ] Start each bed empty
- [ ] Link healthy activities to garden growth
- [ ] Link poor routines to garden wilting
- [ ] Build garden animations and growth stages
- [ ] Add color-coded garden status
- [ ] Add crew-support alert system
- [ ] Ensure alerts include astronaut name
- [ ] Ensure alerts do not expose private health details
- [ ] Add astronaut control to pause or mute alerts

## Phase 8: Doctor dashboard
- [ ] Build doctor login
- [ ] Build astronaut list
- [ ] Allow doctor to click astronaut name
- [ ] Build astronaut profile page
- [ ] Display health, sleep, alertness, check-in trends
- [ ] Display red-flag alerts and AI summaries
- [ ] Add doctor notes and doctor-to-astronaut messaging
- [ ] Restrict access to private astronaut content
- [ ] Add audit logging for doctor access

## Phase 9: The two AIs
- [x] Set up `.env` with `GROQ_API_KEY` (and second key if using another provider)
- [ ] Build AI 1 (Health Trends Assistant): graph explanations
- [ ] Add AI 1 question-and-answer chat
- [ ] Create `medicines.json` from the approved spacecraft medicine list
- [ ] Build AI 2 (Medication Assistant) that answers only from `medicines.json`
- [ ] Add offline fallback responses for both AIs
- [ ] Add safety filters and medical disclaimers
- [ ] Add uncertainty indicators
- [ ] Add escalation rules
- [ ] Prevent diagnosis claims and unsafe medication advice
- [ ] Add doctor-review workflow for serious concerns

## Phase 10: Testing and launch
- [ ] Test offline mode and sync behavior
- [ ] Test login security and privacy rules
- [ ] Test doctor access restrictions
- [ ] Test red-flag alerts and AI responses
- [ ] Test reaction game, greenhouse flow, family messaging, shared garden
- [ ] Conduct usability testing
- [ ] Fix bugs
- [ ] Prepare demo and final presentation
