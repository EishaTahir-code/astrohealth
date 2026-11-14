// FAKE crew for the demo. These are made-up people.
// "flower" is the petal colour of their bed in the crew garden.
export const CREW = [
  { id: 'a1', name: 'Maya Chen', role: 'Commander', flower: 'var(--lime)' },
  { id: 'a2', name: 'Leo Okafor', role: 'Flight engineer', flower: 'var(--bone)' },
  { id: 'a3', name: 'Sara Lindqvist', role: 'Mission specialist', flower: '#9fe3dc' },
]

export function crewName(id) {
  return CREW.find((c) => c.id === id)?.name ?? 'Unknown'
}

export function firstName(id) {
  return crewName(id).split(' ')[0]
}
