import { describe, it, expect } from 'vitest'
import { warmupFor, cooldownFor, sessionFocus, MAX_STRETCHES } from './prepBlocks.js'
import { neatPills } from './neat.js'
import { cleanMusclePrefs, setsForPreference, muscleOfExercise } from './musclePrefs.js'
import { EXIDX } from './exercises.js'

const entry = (id, n = 3, done = true) => ({ id, sets: Array.from({ length: n }, () => ({ reps: 8, done })) })

describe('warm-up', () => {
  it('lasts 3 to 5 minutes for every focus', () => {
    for (const entries of [[entry('0025')], [entry('0042')], [entry('0025'), entry('0042')], []]) {
      const { sec, moves } = warmupFor(entries)
      expect(sec).toBeGreaterThanOrEqual(180)
      expect(sec).toBeLessThanOrEqual(300)
      expect(moves.length).toBeGreaterThan(0)
    }
  })
  it('picks the half of the body the session loads', () => {
    expect(sessionFocus([entry('0025')])).toBe('upper')
    expect(sessionFocus([entry('0042')])).toBe('lower')
    expect(sessionFocus([])).toBe('full')
  })
})

describe('cool-down', () => {
  it('stretches what was worked, most sets first, and skips what was not', () => {
    const c = cooldownFor([entry('0025', 4), entry('0042', 2), entry('0031', 3, false)])
    expect(c.moves.map(m => m.muscle)).toEqual(['chest', 'quadriceps'])
  })
  it('is capped', () => {
    expect(cooldownFor(Object.keys(EXIDX).slice(0, 80).map(id => entry(id))).moves.length).toBeLessThanOrEqual(MAX_STRETCHES)
  })
})

describe('rest-day pills', () => {
  it('walks longer for a sedentary weight-loss profile', () => {
    expect(neatPills({ activityLevel: 'sedentary', trainingGoal: 'lose_weight' })[0]).toEqual({ id: 'walk', min: 30 })
    expect(neatPills({ activityLevel: 'active', trainingGoal: 'bulking' })[0]).toEqual({ id: 'walk', min: 20 })
  })
  it('goes gentle with a lower-body complaint and nudges sedentary users', () => {
    const p = neatPills({ activityLevel: 'sedentary', injuries: ['knee'] })
    expect(p[0].id).toBe('walk-gentle')
    expect(p.some(x => x.id === 'stand-up')).toBe(true)
  })
})

describe('muscle preferences', () => {
  it('cleans unknown muscles and lets less win', () => {
    expect(cleanMusclePrefs({ focus: ['chest', 'nope', 'abs'], less: ['abs'] })).toEqual({ focus: ['chest'], less: ['abs'] })
  })
  it('adds a set for emphasis, capped, and holds maintenance for less', () => {
    expect(setsForPreference(3, 'chest', { focus: ['chest'], less: [] }, 'intermediate')).toBe(4)
    expect(setsForPreference(5, 'chest', { focus: ['chest'], less: [] }, 'advanced')).toBe(5)
    expect(setsForPreference(3, 'chest', { focus: ['chest'], less: [] }, 'beginner')).toBe(3)
    expect(setsForPreference(4, 'chest', { focus: [], less: ['chest'] }, 'advanced')).toBe(2)
    expect(setsForPreference(4, 'biceps', { focus: ['chest'], less: [] }, 'advanced')).toBe(4)
  })
  it('maps an exercise to its muscle', () => {
    expect(muscleOfExercise('0025')).toBe('chest')
  })
})
