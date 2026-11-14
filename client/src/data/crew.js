// FAKE crew for the demo. These are made-up people.
// "flower" is the petal colour of their bed on the Today page; "bloom" is what grows in the crew garden.
export const CREW = [
  { id: 'a1', name: 'Maya Chen', role: 'Commander', flower: 'var(--lime)', bloom: 'violet' },
  { id: 'a2', name: 'Leo Okafor', role: 'Flight engineer', flower: 'var(--bone)', bloom: 'blue' },
  { id: 'a3', name: 'Sara Lindqvist', role: 'Mission specialist', flower: '#9fe3dc', bloom: 'lily' },
  { id: 'a4', name: 'Arjun Mehta', role: 'Payload specialist', flower: '#f0c95a', bloom: 'sun' },
  { id: 'a5', name: 'Hana Sato', role: 'Flight engineer', flower: '#f2a7c3', bloom: 'pink' },
  { id: 'a6', name: 'Tomás Alvarez', role: 'Science officer', flower: '#bfe9ff', bloom: 'star' },
  { id: 'a7', name: 'Amara Nwosu', role: 'Crew medical officer', flower: '#ffb48a', bloom: 'coral' },
  { id: 'a8', name: 'Elena Petrova', role: 'Mission specialist', flower: '#b9a6ff', bloom: 'bell' },
]

export function crewName(id) {
  return CREW.find((c) => c.id === id)?.name ?? 'Unknown'
}

export function firstName(id) {
  return crewName(id).split(' ')[0]
}
