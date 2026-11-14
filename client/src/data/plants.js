// Greenhouse Reset plant library (PRD 6.8). Plants like these have really been grown on the
// International Space Station (in the Veggie unit). Numbers are general guidance for the demo,
// not mission procedures.
const COMMON_MATERIALS = ['Plant pillow (seed pouch with growing medium)', 'Water syringe', 'LED grow light', 'Tweezers', 'Camera']

export const PLANTS = [
  {
    id: 'lettuce',
    name: 'Red romaine lettuce',
    note: 'The first crop astronauts ate on the ISS (Outredgeous, 2015).',
    harvestDays: 33,
    waterEveryDays: 2,
    lightHours: 16,
    materials: COMMON_MATERIALS,
    steps: [
      'Fit the plant pillow into the growth chamber and check it sits flat.',
      'Inject water slowly into the pillow until the wick feels damp, not soaked.',
      'Set the light to 16 hours on, 8 hours off.',
      'Check for sprouts after 3 to 5 days. Thin to one strong seedling per pillow.',
      'Water every 2 days and look at the leaves each day.',
      'Harvest the outer leaves after about 33 days. Clean them with a sanitising wipe before eating.',
    ],
  },
  {
    id: 'mizuna',
    name: 'Mizuna mustard greens',
    note: 'Fast-growing, peppery leaves. Grown on the ISS in 2017.',
    harvestDays: 28,
    waterEveryDays: 2,
    lightHours: 16,
    materials: COMMON_MATERIALS,
    steps: [
      'Seat the plant pillow and open the seed wicks.',
      'Water the pillow slowly until the wick is damp.',
      'Set the light to 16 hours on.',
      'Expect sprouts in 2 to 4 days. Keep the strongest seedling.',
      'Water every 2 days. Turn the chamber fan on low.',
      'Cut and eat leaves from about day 28. They regrow for a second harvest.',
    ],
  },
  {
    id: 'radish',
    name: 'Cherry Belle radish',
    note: 'A root crop, grown on the ISS in the Advanced Plant Habitat (2020).',
    harvestDays: 27,
    waterEveryDays: 1,
    lightHours: 16,
    materials: [...COMMON_MATERIALS, 'Root zone sensor'],
    steps: [
      'Place the seed cartridge in the growth chamber.',
      'Start daily watering with a small amount each time.',
      'Set the light to 16 hours on.',
      'Watch for the first leaves after 2 to 3 days.',
      'Keep watering daily. Roots swell from about day 20.',
      'Pull and harvest at about 27 days, when the red root is round.',
    ],
  },
  {
    id: 'pepper',
    name: 'Chile pepper',
    note: 'The longest plant experiment on the ISS so far (2021), with a taco party at harvest.',
    harvestDays: 120,
    waterEveryDays: 3,
    lightHours: 14,
    materials: [...COMMON_MATERIALS, 'Pollination brush'],
    steps: [
      'Place the seed cartridge and water it well once.',
      'Set the light to 14 hours on.',
      'Sprouts appear after 7 to 10 days. Keep the strongest one.',
      'Water every 3 days. When flowers open, brush pollen between them.',
      'Peppers turn from green to red. Watch for any mould on leaves.',
      'Harvest ripe peppers from about day 120.',
    ],
  },
  {
    id: 'zinnia',
    name: 'Zinnia flowers',
    note: 'Bright orange flowers that bloomed on the ISS in 2016. Not for eating: grown for joy.',
    harvestDays: 60,
    waterEveryDays: 2,
    lightHours: 14,
    materials: COMMON_MATERIALS,
    steps: [
      'Seat the plant pillow and water it slowly.',
      'Set the light to 14 hours on.',
      'Sprouts appear after 4 to 7 days.',
      'Water every 2 days. Zinnias dislike soggy roots: dry, curled leaves can mean too little water, mouldy leaves too much.',
      'Buds form after about 6 weeks.',
      'Enjoy the flowers from about day 60. Photograph them for your family.',
    ],
  },
]

export const STAGES = ['Seed', 'Sprout', 'Seedling', 'Growing', 'Flowering or ready', 'Harvested']

// What to do if a check finds a problem (plant-health alerts).
export const PROBLEMS = {
  yellow: { label: 'Yellow leaves', advice: 'Often too much water. Skip the next watering and check the wick is not soaked.' },
  wilting: { label: 'Wilting or curled leaves', advice: 'Often too little water or too much heat. Water a little now and check the chamber fan.' },
  mould: { label: 'Mould or fuzzy spots', advice: 'Remove the affected leaves with gloves, dry the surface and tell the payload team.' },
  slow: { label: 'Not growing', advice: 'Check the light timer and that the pillow wick is in contact with water.' },
}
