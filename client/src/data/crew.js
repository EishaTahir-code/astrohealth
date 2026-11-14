// FAKE crew for the demo. These are made-up people.
export const CREW = [
  { id: 'a1', name: 'Maya Chen', role: 'Commander' },
  { id: 'a2', name: 'Leo Okafor', role: 'Flight engineer' },
  { id: 'a3', name: 'Sara Lindqvist', role: 'Mission specialist' },
]

// The astronaut using "My space" in this demo.
export const ME = 'a1'

export function crewName(id) {
  return CREW.find((c) => c.id === id)?.name ?? 'Unknown'
}
