import { describe, it, expect } from 'vitest'
import { GOALS, normalizeProfile, emphasisFor, recommendRoutines, buildRecommendedPlan } from './routineRecommendations.js'

const names = r => r.plan.routines.map(x => x.name)

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

  it('picks the split from the days and the goal', () => {
    expect(recommendRoutines({ daysAvailable: 4, goal: 'hypertrophy' }).split).toBe('upper-lower')
    expect(recommendRoutines({ daysAvailable: 3, goal: 'strength' }).split).toBe('5x5')
    expect(recommendRoutines({ daysAvailable: 3, goal: 'hypertrophy' }).split).toBe('ppl')
    expect(recommendRoutines({ daysAvailable: 3, goal: 'recomposition' }).split).toBe('full-body')
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
    const total = r => r.plan.routines.reduce((n, x) => n + x.ex.reduce((m, e) => m + e.sets, 0), 0)
    const even = buildRecommendedPlan({ gender: 'other', daysAvailable: 4, goal: 'hypertrophy' })
    const lower = buildRecommendedPlan({ gender: 'female', daysAvailable: 4, goal: 'hypertrophy' })
    // only the two lower sessions hold leg work, so each gains exactly one set
    expect(total(lower) - total(even)).toBe(2)
    const s1 = buildRecommendedPlan({ gender: 'female', daysAvailable: 3, goal: 'strength' })
    const s2 = buildRecommendedPlan({ gender: 'male', daysAvailable: 3, goal: 'strength' })
    expect(total(s1)).toBe(total(s2))
    s1.plan.routines.forEach(r => r.ex.forEach(e => expect(e.reps).toBe(5)))
  })

  it('lets an explicit emphasis win over the gender', () => {
    expect(emphasisFor({ gender: 'female', goal: 'hypertrophy' })).toBe('lower')
    expect(emphasisFor({ gender: 'female', goal: 'hypertrophy' }, 'balanced')).toBe('balanced')
    expect(emphasisFor({ gender: 'female', goal: 'strength' })).toBe('balanced')
  })

  it('falls back to safe defaults for a missing or odd profile', () => {
    expect(normalizeProfile()).toEqual({ gender: null, daysAvailable: 3, goal: 'hypertrophy' })
    expect(normalizeProfile({ gender: 'x', daysAvailable: 9, goal: 'y' })).toEqual({ gender: null, daysAvailable: 5, goal: 'hypertrophy' })
    expect(normalizeProfile({ daysAvailable: 0 }).daysAvailable).toBe(2)
    expect(buildRecommendedPlan(undefined).plan.schedule).toHaveLength(3)
  })
})
