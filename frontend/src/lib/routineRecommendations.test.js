import { describe, it, expect } from 'vitest'
import { GOALS, normalizeProfile, emphasisFor, recommendRoutines, buildRecommendedPlan, safeVariant, weeklySetsByMuscle } from './routineRecommendations.js'

const names = r => r.plan.routines.map(x => x.name)
const exercises = r => r.plan.routines.flatMap(x => x.ex)
const ids = r => new Set(exercises(r).map(e => e.id))
const totalSets = r => r.plan.routines.reduce((n, x) => n + x.ex.reduce((m, e) => m + e.sets, 0), 0)

describe('recommendRoutines', () => {
  it('gives exactly one session per available day, on distinct weekdays', () => {
    for (const goal of GOALS) for (const gender of ['male', 'female', 'other', null]) for (const daysAvailable of [2, 3, 4, 5]) {
      const rec = buildRecommendedPlan({ gender, daysAvailable, goal })
      expect(rec.plan.schedule).toHaveLength(daysAvailable)
      expect(new Set(rec.plan.schedule.map(s => s.day)).size).toBe(daysAvailable)
      const ids = new Set(rec.plan.routines.map(r => r.id))
      rec.plan.schedule.forEach(s => expect(ids.has(s.routineId)).toBe(true))
    }
  })

  it('maps the days to the split whatever the goal', () => {
    for (const goal of GOALS) {
      expect(recommendRoutines({ daysAvailable: 2, goal }).split).toBe('full-body')
      expect(recommendRoutines({ daysAvailable: 3, goal }).split).toBe('ppl')
      expect(recommendRoutines({ daysAvailable: 4, goal }).split).toBe('upper-lower')
      expect(recommendRoutines({ daysAvailable: 5, goal }).split).toBe('ppl-upper-lower')
    }
    expect(names(buildRecommendedPlan({ daysAvailable: 2 }))).toEqual(['Full Body A', 'Full Body B'])
    expect(names(buildRecommendedPlan({ daysAvailable: 3 }))).toEqual(['Push Day', 'Pull Day', 'Leg Day'])
    expect(names(buildRecommendedPlan({ daysAvailable: 5 }))).toEqual(['Push Day', 'Pull Day', 'Leg Day', 'Upper A', 'Lower A'])
  })

  it('puts the legs first in a four-day week for a lower emphasis', () => {
    const lower = buildRecommendedPlan({ gender: 'female', daysAvailable: 4, goal: 'hypertrophy' })
    const upper = buildRecommendedPlan({ gender: 'male', daysAvailable: 4, goal: 'hypertrophy' })
    const first = r => r.plan.routines.find(x => x.id === r.plan.schedule[0].routineId).name
    expect(first(lower)).toBe('Lower A')
    expect(first(upper)).toBe('Upper A')
  })

  it('adds at most one set per session to the emphasised half, and none for strength', () => {
    const even = buildRecommendedPlan({ gender: 'other', daysAvailable: 4, goal: 'hypertrophy' })
    const lower = buildRecommendedPlan({ gender: 'female', daysAvailable: 4, goal: 'hypertrophy' })
    // only the two lower sessions hold leg work, so each gains exactly one set
    expect(totalSets(lower) - totalSets(even)).toBe(2)
    const s1 = buildRecommendedPlan({ gender: 'female', daysAvailable: 3, goal: 'strength' })
    const s2 = buildRecommendedPlan({ gender: 'male', daysAvailable: 3, goal: 'strength' })
    expect(totalSets(s1)).toBe(totalSets(s2))
  })

  it('lets an explicit emphasis win over the gender', () => {
    expect(emphasisFor({ gender: 'female', goal: 'hypertrophy' })).toBe('lower')
    expect(emphasisFor({ gender: 'female', goal: 'hypertrophy' }, 'balanced')).toBe('balanced')
    expect(emphasisFor({ gender: 'female', goal: 'strength' })).toBe('balanced')
  })

  it('falls back to safe defaults for a missing or odd profile', () => {
    expect(normalizeProfile()).toEqual({ gender: null, daysAvailable: 3, goal: 'hypertrophy', experience: null, bodyType: null, injuries: [], focus: [], less: [] })
    expect(normalizeProfile({ gender: 'x', daysAvailable: 9, goal: 'y', experience: 'z', bodyType: 'q', injuries: ['tail', 'knee'] }))
      .toEqual({ gender: null, daysAvailable: 5, goal: 'hypertrophy', experience: null, bodyType: null, injuries: ['knee'], focus: [], less: [] })
    expect(normalizeProfile({ daysAvailable: 0 }).daysAvailable).toBe(2)
    expect(buildRecommendedPlan(undefined).plan.schedule).toHaveLength(3)
  })
})

describe('goal', () => {
  const reps = goal => exercises(buildRecommendedPlan({ daysAvailable: 4, goal })).map(e => e.reps)

  it('reads the onboarding goals', () => {
    expect(normalizeProfile({ goal: 'lose_weight' }).goal).toBe('recomposition')
    expect(normalizeProfile({ goal: 'maintain' }).goal).toBe('recomposition')
    expect(normalizeProfile({ goal: 'bulking' }).goal).toBe('hypertrophy')
    expect(normalizeProfile({ goal: 'strength' }).goal).toBe('strength')
  })

  it('sets the rep range', () => {
    reps('strength').forEach(r => { expect(r).toBeGreaterThanOrEqual(3); expect(r).toBeLessThanOrEqual(6) })
    reps('hypertrophy').forEach(r => { expect(r).toBeGreaterThanOrEqual(6); expect(r).toBeLessThanOrEqual(12) })
    reps('recomposition').forEach(r => { expect(r).toBeGreaterThanOrEqual(8); expect(r).toBeLessThanOrEqual(15) })
    expect(Math.max(...reps('recomposition'))).toBeGreaterThan(12)
  })

  it('sets rest and RIR: heavy and long for strength, short and moderate to lose weight', () => {
    const lift = goal => exercises(buildRecommendedPlan({ daysAvailable: 3, goal, experience: 'intermediate' }))[0]
    expect(lift('strength')).toMatchObject({ restSec: 180, targetRir: 1 })
    expect(lift('hypertrophy')).toMatchObject({ restSec: 120, targetRir: 1 })
    const cut = lift('recomposition')
    expect(cut.restSec).toBe(90)
    expect('targetRir' in cut).toBe(false)
  })
})

describe('experience', () => {
  const plan = (experience, extra) => buildRecommendedPlan({ daysAvailable: 4, goal: 'hypertrophy', experience, ...extra })

  it('keeps a beginner near the minimum effective volume', () => {
    const rec = plan('beginner')
    exercises(rec).forEach(e => expect(e.sets).toBeLessThanOrEqual(3))
    expect(exercises(rec).every(e => e.reps > 10 ? e.sets <= 2 : true)).toBe(true)
    // one extra rep in reserve for the technique work
    expect(exercises(plan('beginner', { goal: 'recomposition' }))[0].targetRir).toBe(3)
    expect(exercises(plan('intermediate', { goal: 'recomposition' }))[0].targetRir).toBeUndefined()
  })

  it('works more sets the more experienced, in every muscle', () => {
    const sets = e => totalSets(plan(e))
    expect(sets('beginner')).toBeLessThan(sets('intermediate'))
    expect(sets('intermediate')).toBeLessThan(sets('advanced'))
    const by = e => weeklySetsByMuscle(plan(e).plan)
    for (const m of Object.keys(by('beginner'))) {
      expect(by('beginner')[m]).toBeLessThanOrEqual(by('intermediate')[m])
      expect(by('intermediate')[m]).toBeLessThanOrEqual(by('advanced')[m])
    }
  })

  it('leaves the volume alone when experience is unknown', () => {
    expect(totalSets(plan(undefined))).toBe(totalSets(plan('intermediate')))
  })

  it('gives a beginner no extra emphasis set', () => {
    const base = totalSets(plan('beginner', { gender: 'other' }))
    expect(totalSets(plan('beginner', { gender: 'female' }))).toBe(base)
  })
})

describe('body type', () => {
  const plan = bodyType => buildRecommendedPlan({ daysAvailable: 3, goal: 'recomposition', experience: 'intermediate', bodyType })

  it('trims the metabolic work and rests longer when it is hard to gain weight', () => {
    const slim = plan('slim_hard_to_gain'), plain = plan('athletic_balanced')
    expect(totalSets(slim)).toBeLessThan(totalSets(plain))
    exercises(slim).forEach(e => expect(e.reps).toBeLessThanOrEqual(12))
    expect(Math.max(...exercises(plain).map(e => e.reps))).toBeGreaterThan(12)
    expect(exercises(slim)[0].restSec).toBe(exercises(plain)[0].restSec + 30)
  })

  it('tolerates a little more density when it is easy to gain', () => {
    const easy = plan('easy_to_gain'), plain = plan('athletic_balanced')
    expect(totalSets(easy)).toBe(totalSets(plain))
    expect(exercises(easy)[0].restSec).toBe(exercises(plain)[0].restSec - 15)
  })

  it('does not cap strength reps', () => {
    const s = buildRecommendedPlan({ daysAvailable: 3, goal: 'strength', bodyType: 'slim_hard_to_gain' })
    expect(exercises(s)[0].reps).toBe(5)
  })
})

describe('injuries', () => {
  const plan = (injuries, extra) => buildRecommendedPlan({ daysAvailable: 4, goal: 'hypertrophy', injuries, ...extra })
  const AXIAL = ['0043', '0085', '0027', '0426']

  it('takes the axial loading out for a bad lower back', () => {
    const base = ids(plan([]))
    AXIAL.forEach(id => expect(base.has(id)).toBe(true))
    const safe = ids(plan(['lower_back']))
    AXIAL.forEach(id => expect(safe.has(id)).toBe(false))
    expect(safe.has('0739')).toBe(true) // leg press
    expect(safe.has('1350')).toBe(true) // supported row
  })

  it('drops the squat and the leg extension for sore knees', () => {
    const safe = ids(plan(['knee']))
    expect(safe.has('0043')).toBe(false)
    expect(safe.has('0585')).toBe(false)
    expect(safe.has('0085')).toBe(true)
  })

  it('never repeats an exercise inside a routine', () => {
    for (const r of plan(['lower_back', 'knee', 'shoulder']).plan.routines) {
      const list = r.ex.map(e => e.id)
      expect(new Set(list).size).toBe(list.length)
    }
  })

  it('keeps every day trainable, and also fitted to the equipment', () => {
    const rec = plan(['lower_back', 'knee'], { daysAvailable: 5 })
    expect(rec.plan.schedule).toHaveLength(5)
    rec.plan.routines.forEach(r => expect(r.ex.length).toBeGreaterThan(0))
    const home = buildRecommendedPlan({ daysAvailable: 3, injuries: ['lower_back'] }, { equipment: ['body weight', 'dumbbell'] })
    expect(home.plan.schedule).toHaveLength(3)
    expect(ids(home).has('0043')).toBe(false)
    expect(ids(home).has('0085')).toBe(false)
  })

  it('swaps one exercise at a time', () => {
    expect(safeVariant('0043', ['lower_back'])).toBe('0739')
    expect(safeVariant('0585', ['knee'])).toBeNull()
    expect(safeVariant('0426', ['lower_back', 'shoulder'])).toBeNull()
    expect(safeVariant('0025', ['lower_back', 'knee'])).toBeUndefined()
    expect(safeVariant('0043', [])).toBeUndefined()
    expect(safeVariant('0043', ['hip'])).toBeUndefined()
  })

  it('changes nothing for an area it has no rule for', () => {
    expect(ids(plan(['neck', 'ankle']))).toEqual(ids(plan([])))
  })
})
