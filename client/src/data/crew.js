// The crew shown in the garden, the doctor's list and on the Today page.
//
// - DEMO_CREW: the made-up demo crew (these are not real people). Their accounts exist in Supabase
//   with the password "demo1234".
// - Real people who sign up get a flower bed too. Their names come from Supabase (profiles) and are
//   kept on this device, so the garden still shows them with no internet.
// "flower" is the petal colour of their bed on the Today page; "bloom" is what grows in the crew garden.
import { useSyncExternalStore } from 'react'
import { getSetting, setSetting } from '../lib/db'

export const DEMO_CREW = [
  { id: 'a1', name: 'Maya Chen', role: 'Commander', flower: 'var(--lime)', bloom: 'violet' },
  { id: 'a2', name: 'Leo Okafor', role: 'Flight engineer', flower: 'var(--bone)', bloom: 'blue' },
  { id: 'a3', name: 'Sara Lindqvist', role: 'Mission specialist', flower: '#9fe3dc', bloom: 'lily' },
  { id: 'a4', name: 'Arjun Mehta', role: 'Payload specialist', flower: '#f0c95a', bloom: 'sun' },
  { id: 'a5', name: 'Hana Sato', role: 'Flight engineer', flower: '#f2a7c3', bloom: 'pink' },
  { id: 'a6', name: 'Tomás Alvarez', role: 'Science officer', flower: '#bfe9ff', bloom: 'star' },
  { id: 'a7', name: 'Amara Nwosu', role: 'Crew medical officer', flower: '#ffb48a', bloom: 'coral' },
  { id: 'a8', name: 'Elena Petrova', role: 'Mission specialist', flower: '#b9a6ff', bloom: 'bell' },
]

// Which crew this device shows: 'demo' (the made-up crew) or 'real' (people who signed up).
let world = 'demo'
let realCrew = []
let snapshot = DEMO_CREW
const listeners = new Set()

function emit() {
  snapshot = world === 'real' ? realCrew : DEMO_CREW
  listeners.forEach((l) => l())
}

// Loads the last known crew from this device (called once when the app starts).
export async function loadCrew() {
  try {
    world = await getSetting('crewWorld', 'demo')
    realCrew = await getSetting('crew:real', [])
  } catch {
    // keep the demo crew
  }
  emit()
}

// Called after sign-in and after each sync with the astronauts from Supabase.
export async function saveCrew(isDemo, profiles) {
  world = isDemo ? 'demo' : 'real'
  if (!isDemo) {
    realCrew = profiles
      .filter((p) => p.role === 'astronaut')
      .map((p) => ({ id: p.crew_id, name: p.name, role: p.title || 'Crew member', flower: p.flower, bloom: p.bloom }))
    await setSetting('crew:real', realCrew)
  }
  await setSetting('crewWorld', world)
  emit()
}

// Switches the shown crew when someone signs in (before the first sync has finished).
export async function setCrewWorld(isDemo) {
  world = isDemo ? 'demo' : 'real'
  await setSetting('crewWorld', world)
  emit()
}

export function getCrew() {
  return snapshot
}

// React hook: the crew list. Updates when people join.
export function useCrew() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
  )
}

export function crewPerson(id) {
  return snapshot.find((c) => c.id === id) ?? DEMO_CREW.find((c) => c.id === id) ?? realCrew.find((c) => c.id === id) ?? null
}

export function crewName(id) {
  return crewPerson(id)?.name ?? 'Crew member'
}

export function firstName(id) {
  return crewName(id).split(' ')[0]
}
