// Muscle preferences of the baseline profile: the areas to emphasise (a set more, towards the
// adaptive range, MAV) and the ones to go easy on (held at maintenance volume, near the MEV).
// Muscles use the slugs of lib/muscles.js MUSCLES, so the names on screen are MUSCLE_NAME.
import { EXIDX } from './exercises.js'

export const PREF_MUSCLES = ['chest', 'upper-back', 'deltoids', 'biceps', 'triceps', 'abs', 'lower-back', 'gluteal', 'quadriceps', 'hamstring', 'calves']

// The catalogue's target muscle (`tg`) read as one of the slugs above.
const BY_TARGET = {
  pectorals: 'chest', lats: 'upper-back', 'upper back': 'upper-back', traps: 'upper-back',
  delts: 'deltoids', biceps: 'biceps', triceps: 'triceps', abs: 'abs', obliques: 'abs',
  spine: 'lower-back', glutes: 'gluteal', quads: 'quadriceps', hamstrings: 'hamstring', calves: 'calves'
}

/** The preference muscle an exercise mainly trains, or null (cardio, forearms, custom exercises). */
export const muscleOfExercise = id => BY_TARGET[EXIDX[id]?.tg] || null

const clean = list => [...new Set((Array.isArray(list) ? list : []).filter(m => PREF_MUSCLES.includes(m)))]

/** Both lists, known muscles only. A muscle asked to go easy on is never also emphasised. */
export function cleanMusclePrefs({ focus, less } = {}) {
  const lessList = clean(less)
  return { focus: clean(focus).filter(m => !lessList.includes(m)), less: lessList }
}

export const EMPHASIS_CAP = 5 // sets on one exercise in a session, the top of the adaptive range
export const BEGINNER_CAP = 3 // a beginner stays near the minimum effective volume
export const MAINTENANCE_SETS = 2

/** Sets for one exercise once the preference is applied: one more for emphasis, maintenance for less. */
export function setsForPreference(sets, muscle, { focus = [], less = [] } = {}, experience = null) {
  if (!muscle) return sets
  if (less.includes(muscle)) return Math.min(sets, MAINTENANCE_SETS)
  if (focus.includes(muscle)) return Math.max(sets, Math.min(experience === 'beginner' ? BEGINNER_CAP : EMPHASIS_CAP, sets + 1))
  return sets
}
