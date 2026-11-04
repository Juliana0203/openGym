// The baseline profile the setup wizard collects and Settings lets you edit later. Pure helpers:
// the wizard (components/ProfileWizard.jsx) only keeps a draft and calls applyProfile.
//
// Nothing here duplicates a field the app already has:
//  - weight is a weigh-in in S.bodyweight (in S.unit), so the first one is the chart's zero point
//    and every later weigh-in shows the progress from it;
//  - age is stored as S.birthYear, which the strength levels already read (lib/strength-level.js);
//  - gender is S.gender, mirrored into S.sex for male and female when no sex is set yet.
// Height is kept in cm and shown in cm or inches by the weight unit, like the body measurements.
import { addWeighIn } from './weigh-ins.js'
import { isoOf } from './format.js'

export const ACTIVITY_LEVELS = ['sedentary', 'moderate', 'active']
export const BODY_TYPES = ['slim_hard_to_gain', 'easy_to_gain', 'athletic_balanced']
export const EXPERIENCES = ['beginner', 'intermediate', 'advanced']
export const TRAINING_GOALS = ['lose_weight', 'maintain', 'bulking', 'strength']
export const INJURY_AREAS = ['neck', 'shoulder', 'elbow', 'wrist', 'lower_back', 'hip', 'knee', 'ankle']
export const MIN_DAYS = 2
export const MAX_DAYS = 5

const RANGE = { age: [10, 100], cm: [100, 250], kg: [25, 300] }
const LB_PER_KG = 2.2046226218
const IN_PER_CM = 1 / 2.54

const round1 = n => Math.round(n * 10) / 10
const oneOf = (list, v) => (list.includes(v) ? v : null)

export const heightUnit = unit => (unit === 'lb' ? 'in' : 'cm')
export const cmToDisplay = (cm, unit) => (cm > 0 ? round1(unit === 'lb' ? cm * IN_PER_CM : cm) : null)
export const displayToCm = (v, unit) => (v > 0 ? round1(unit === 'lb' ? v * 2.54 : v) : null)
export const weightToUnit = (w, from, to) => (!(w > 0) || from === to ? w : round1(to === 'lb' ? w * LB_PER_KG : w / LB_PER_KG))

const inRange = (n, [lo, hi]) => Number.isFinite(n) && n >= lo && n <= hi

/** Whether the typed numbers make sense, per field; null fields are simply not given. */
export function validateDraft(draft, unit = 'kg') {
  const kg = weightToUnit(Number(draft?.weight), unit, 'kg')
  const cm = displayToCm(Number(draft?.height), unit)
  return {
    age: draft?.age == null || inRange(Number(draft.age), RANGE.age),
    weight: draft?.weight == null || inRange(kg, RANGE.kg),
    height: draft?.height == null || inRange(cm, RANGE.cm)
  }
}

/** What the wizard starts from: what is saved now, in the unit on screen (S.unit). */
export function draftFromState(S, now = new Date()) {
  const unit = S?.unit === 'lb' ? 'lb' : 'kg'
  const last = latestWeight(S)
  const born = Number(S?.birthYear)
  return {
    gender: oneOf(['male', 'female', 'other'], S?.gender),
    age: born > 0 ? now.getFullYear() - born : null,
    weight: last ? last.w : null,
    height: cmToDisplay(Number(S?.height), unit),
    activityLevel: oneOf(ACTIVITY_LEVELS, S?.activityLevel),
    bodyType: oneOf(BODY_TYPES, S?.bodyType),
    trainingGoal: oneOf(TRAINING_GOALS, S?.trainingGoal),
    daysAvailable: Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(Number(S?.daysAvailable)) || 3)),
    experience: oneOf(EXPERIENCES, S?.experience),
    injuries: Array.isArray(S?.injuries) ? S.injuries.filter(i => INJURY_AREAS.includes(i)) : [],
    injuriesNote: typeof S?.injuriesNote === 'string' ? S.injuriesNote : ''
  }
}

/**
 * Writes a draft into the state (S is mutated, as in update()). Fields left empty are removed so a
 * cleared answer does not linger. A weight that differs from the latest weigh-in is logged as a
 * new weigh-in today; one that has not changed adds nothing. Returns what was logged, or null.
 */
export function applyProfile(S, draft, now = Date.now()) {
  const d = draft || {}
  const unit = S.unit === 'lb' ? 'lb' : 'kg'
  const set = (key, value) => { if (value == null || value === '' || (Array.isArray(value) && !value.length)) delete S[key]; else S[key] = value }
  const ok = validateDraft(d, unit)
  set('gender', oneOf(['male', 'female', 'other'], d.gender))
  if ((S.gender === 'male' || S.gender === 'female') && !S.sex) S.sex = S.gender
  set('birthYear', ok.age && d.age != null ? new Date(now).getFullYear() - Math.round(Number(d.age)) : null)
  set('height', ok.height ? displayToCm(Number(d.height), unit) : null)
  set('activityLevel', oneOf(ACTIVITY_LEVELS, d.activityLevel))
  set('bodyType', oneOf(BODY_TYPES, d.bodyType))
  set('trainingGoal', oneOf(TRAINING_GOALS, d.trainingGoal))
  set('daysAvailable', Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(Number(d.daysAvailable)) || 3)))
  set('experience', oneOf(EXPERIENCES, d.experience))
  set('injuries', (d.injuries || []).filter(i => INJURY_AREAS.includes(i)))
  set('injuriesNote', String(d.injuriesNote || '').trim().slice(0, 300))
  S.profileAt = now
  let logged = null
  const w = Number(d.weight)
  const last = latestWeight(S)
  if (ok.weight && w > 0 && !(last && round1(last.w) === round1(w))) {
    logged = addWeighIn(S, { d: isoOf(new Date(now)), w, t: now })
  }
  return logged
}

/** The weigh-in the chart starts from, the latest, and how far it has moved ({ start, now, delta }). */
export function weightProgress(S) {
  const list = (S?.bodyweight || []).filter(b => b && Number(b.w) > 0)
  if (!list.length) return null
  const sorted = [...list].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
  const start = sorted[0], now = sorted[sorted.length - 1]
  return { start: { d: start.d, w: Number(start.w) }, now: { d: now.d, w: Number(now.w) }, delta: round1(Number(now.w) - Number(start.w)) }
}

export function latestWeight(S) {
  const p = weightProgress(S)
  return p ? p.now : null
}

// The goals the recommender is written for are lib/routineRecommendations.js GOALS; it also reads
// the wizard's own (lose_weight, maintain, bulking, strength) through its aliases.

/** The profile lib/routineRecommendations.js plans for, from what is saved (it reads the wizard's goals itself). */
export function recommenderProfile(S) {
  return {
    gender: oneOf(['male', 'female', 'other'], S?.gender),
    daysAvailable: S?.daysAvailable,
    goal: S?.trainingGoal,
    experience: S?.experience,
    bodyType: S?.bodyType,
    injuries: Array.isArray(S?.injuries) ? S.injuries : []
  }
}

export const profileDone = S => Number(S?.profileAt) > 0
