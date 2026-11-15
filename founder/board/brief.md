# Board brief: Orbloom

This brief stands on its own. It describes the idea and the prototype as the team built it. It contains no opinion of the idea.

## The idea (founder/idea.md)

- What it is: an offline-first health and well-being companion app for astronauts on long missions, with a flight-surgeon dashboard on the ground.
- Who it is for: astronauts and analog-mission crews on long missions with an unreliable link to Earth, and the flight surgeons who look after them. The organisations that would adopt it are space agencies, commercial space-station operators and analog-mission programmes (Mars/Moon simulation habitats).
- What it sells, at what price: no price set yet. It is a working hackathon prototype, free to try at a public link.
- Where and how: a web app that installs on phones and laptops and works with no internet; data syncs when a link opens.
- Budget and constraints: no money spent; runs on free tiers (Supabase free plan, Groq free AI plan, GitHub Pages). Team of three students (Team Nocoders). Built for a hackathon whose challenge asks teams to use NASA or space-agency data. Pitch: 7 minutes plus 3 minutes of judge questions.

## The problem the team describes

- No doctor on board: the flight surgeon is on the ground.
- The link comes and goes: toward Mars a message can take up to about 20 minutes each way, and most health apps assume constant connectivity.
- Long missions bring isolation, disrupted sleep, stress, heavy workloads and separation from family; decline is often gradual, not an emergency.
- Astronauts need emotional and social support, not only medical monitoring.

## What the prototype does today (working, live)

Astronaut side:
- Daily check-in: mood, stress, energy, sleep, workload (1 to 5). Private to the device; never shared.
- Health: logs blood pressure, heart rate, temperature, sleep, blood sugar; each reading shown against general reference ranges (green/yellow/red) with trend graphs. Red readings create an alert for the flight surgeon.
- Health assistant (AI, Groq-hosted open model): explains readings in plain words, never diagnoses; red-flag symptoms bypass the AI and point to the flight surgeon.
- Medical kit: the 95 medicines of NASA's ISS Medical Kit Checklist (strength, route, side effects, which pack, crew self-care vs flight-surgeon-only), searchable offline. No AI here, by design.
- Alertness game: 30-second reaction test (reaction time, accuracy, consistency, score out of 100 vs the person's usual level).
- Greenhouse: grow one of seven crops NASA grew on the ISS (Veggie and Advanced Plant Habitat research), with steps and a daily care checklist.
- Family: messages home written offline, queued and sent when a link opens. Family members have no app yet; replies are automatic placeholders.
- Crew garden: each astronaut has a flower bed in a shared garden that blooms with check-ins, rest and greenhouse care and wilts when routines slip; crewmates get a gentle prompt to check in. No health numbers are shown; anyone can turn it off for themselves.
- Get medical help: a help signal to the flight surgeon, sent at once or as soon as the link opens.

Flight-surgeon side:
- Dashboard of the crew: readings, alertness, red-flag alerts, an AI summary per astronaut, notes and messages. Never sees check-in answers, moods, private notes or family messages. Every visit is recorded in an access log.

How it is built:
- React web app, installable, works fully offline; data saved and encrypted on the device first, synced to Supabase (PostgreSQL with row-level security) when online. Accounts with sign-up, password reset and an invite code for flight surgeons. AI runs in a server function; the API key is never on the device.
- Sample accounts with a made-up crew of eight so anyone can try it.

## Stage and evidence

- A working prototype, built during a hackathon. No users beyond the team and testers; no interviews with astronauts or flight surgeons yet; no pilot, no revenue, no price.
- NASA data used: the ISS Medical Kit Checklist (95 medicines) and NASA ISS plant research (seven crops).
- The team's stated ask: introductions to flight surgeons and analog-mission crews to test it, and feedback on what would make it trustworthy on a real mission.

## Open facts nobody has yet

- Who pays and how much (no buyer conversations yet).
- The size of the market (number of long-duration crews, analog missions per year).
- What existing tools space agencies already use for crew health and behavioural health.
