// FAKE crew for the demo. These are made-up people.
// "flower" is the petal colour of their bed in the crew garden.
export const CREW = [
  { id: 'a1', name: 'Maya Chen', role: 'Commander', flower: 'var(--lavender)' },
  { id: 'a2', name: 'Leo Okafor', role: 'Flight engineer', flower: 'var(--periwinkle)' },
  { id: 'a3', name: 'Sara Lindqvist', role: 'Mission specialist', flower: 'var(--marigold)' },
]

// The astronaut using "My space" in this demo.
export const ME = 'a1'

export function crewName(id) {
  return CREW.find((c) => c.id === id)?.name ?? 'Unknown'
}

export function firstName(id) {
  return crewName(id).split(' ')[0]
}
