import { EXIDX } from './exercises.js'

// Smart Swap: when the machine you planned is taken, the same movement with other equipment.
// Reviewed catalogue ids only, ordered by how closely each one reproduces the movement.
// `muscle` is the muscle the pattern trains, which can differ from a member's catalogue target
// (a dumbbell pullover is catalogued under the chest but is a lat movement).
export const SWAP_PATTERNS = {
  'vertical pull': {
    muscle: 'lats',
    ids: ['0652', '0292', '0375', '1326', '1429', '0017', '0198', '2330'],
  },
  'horizontal pull': {
    muscle: 'upper back',
    ids: ['0292', '0293', '0327', '0499', '0808', '0861', '0180', '1350', '0606', '0027', '3017'],
  },
  'knee extension': {
    muscle: 'quads',
    ids: ['1489', '1760', '2290', '0410', '0585', '5664', '0042'],
  },
}

export const SWAP_EQUIPMENT = ['bodyweight', 'dumbbell', 'machine', 'barbell']

const EQ_CLASS = {
  'body weight': 'bodyweight',
  dumbbell: 'dumbbell',
  barbell: 'barbell',
  'ez barbell': 'barbell',
  'olympic barbell': 'barbell',
  cable: 'machine',
  'leverage machine': 'machine',
  'sled machine': 'machine',
  'smith machine': 'machine',
  assisted: 'machine',
}

const patternOf = new Map(Object.entries(SWAP_PATTERNS).flatMap(([name, p]) => p.ids.map(id => [id, name])))

/** The equipment class (bodyweight, dumbbell, machine, barbell) of an exercise, or null. */
export function equipmentClassOf(ex) {
  return (ex && EQ_CLASS[ex.eq]) || null
}

/** The reviewed movement pattern of an exercise ('vertical pull'...), or null. */
export function movementPatternOf(ex) {
  return (ex && !ex.custom && patternOf.get(String(ex.id))) || null
}

/**
 * Equivalent exercises that use other equipment than `exercise`, best first. One per equipment
 * class goes first (so the panel offers real choices), then the rest by pattern order.
 * `equipment` restricts the classes offered; `exclude` are ids already in the session.
 */
export function swapAlternatives(exercise, { equipment, exclude = [], limit = 3 } = {}) {
  const pattern = movementPatternOf(exercise)
  if (!pattern) return []
  const own = equipmentClassOf(exercise)
  const wanted = equipment?.length ? equipment : SWAP_EQUIPMENT
  const taken = new Set([String(exercise.id), ...exclude.map(String)])
  const pool = SWAP_PATTERNS[pattern].ids
    .filter(id => !taken.has(id) && EXIDX[id])
    .map(id => EXIDX[id])
    .filter(ex => { const c = equipmentClassOf(ex); return c && c !== own && wanted.includes(c) })
  const firstOfClass = []
  const seen = new Set()
  for (const ex of pool) {
    const c = equipmentClassOf(ex)
    if (!seen.has(c)) { seen.add(c); firstOfClass.push(ex) }
  }
  const rest = pool.filter(ex => !firstOfClass.includes(ex))
  return [...firstOfClass, ...rest].slice(0, limit)
    .map(ex => ({ ex, equipment: equipmentClassOf(ex), pattern, muscle: SWAP_PATTERNS[pattern].muscle }))
}
