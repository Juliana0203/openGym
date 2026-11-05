import { describe, it, expect } from 'vitest'
import { applyProfile, draftFromState, weightProgress, recommenderProfile, validateDraft, cmToDisplay, displayToCm, profileDone } from './profile.js'

const NOW = new Date(2026, 4, 10, 9, 0).getTime()
const full = {
  gender: 'female', age: 30, weight: 62, height: 168, activityLevel: 'moderate', bodyType: 'athletic_balanced',
  trainingGoal: 'strength', daysAvailable: 4, experience: 'beginner', injuries: ['knee', 'bogus'], injuriesNote: '  left knee  '
}

describe('applyProfile', () => {
  it('saves the answers and logs the weight as the first weigh-in', () => {
    const S = { unit: 'kg', bodyweight: [] }
    const logged = applyProfile(S, full, NOW)
    expect(logged.w).toBe(62)
    expect(S.bodyweight).toHaveLength(1)
    expect(S.bodyweight[0].d).toBe('2026-05-10')
    expect(S).toMatchObject({
      gender: 'female', sex: 'female', birthYear: 1996, height: 168, activityLevel: 'moderate',
      bodyType: 'athletic_balanced', trainingGoal: 'strength', daysAvailable: 4, experience: 'beginner',
      injuries: ['knee'], injuriesNote: 'left knee', profileAt: NOW
    })
    expect(profileDone(S)).toBe(true)
  })

  it('does not log the same weight twice and drops cleared answers', () => {
    const S = { unit: 'kg', bodyweight: [] }
    applyProfile(S, full, NOW)
    applyProfile(S, { ...full, height: null, injuries: [], injuriesNote: '' }, NOW + 1000)
    expect(S.bodyweight[0].ins).toHaveLength(1)
    expect('height' in S).toBe(false)
    expect('injuries' in S).toBe(false)
  })

  it('ignores impossible numbers and keeps the day count in range', () => {
    const S = { unit: 'kg', bodyweight: [] }
    applyProfile(S, { ...full, age: 2, weight: 900, height: 3, daysAvailable: 9 }, NOW)
    expect(S.bodyweight).toHaveLength(0)
    expect(S.birthYear).toBeUndefined()
    expect(S.height).toBeUndefined()
    expect(S.daysAvailable).toBe(5)
  })

  it('stores height in cm when the unit is lb', () => {
    const S = { unit: 'lb', bodyweight: [] }
    applyProfile(S, { ...full, weight: 140, height: 66 }, NOW)
    expect(S.height).toBeCloseTo(167.6, 1)
    expect(draftFromState(S).height).toBeCloseTo(66, 0)
  })
})

describe('progression and muscle preferences', () => {
  it('assigns the progression from the goal', () => {
    const lose = { unit: 'kg', bodyweight: [] }
    applyProfile(lose, { ...full, trainingGoal: 'lose_weight' }, NOW)
    expect(lose.progDefault).toBe('linear')
    const bulk = { unit: 'kg', bodyweight: [], progDefault: 'linear' }
    applyProfile(bulk, { ...full, trainingGoal: 'bulking' }, NOW)
    expect(bulk.progDefault).toBe('double')
  })
  it('follows a goal change while it was automatic, but never overrides a manual choice', () => {
    const S = { unit: 'kg', bodyweight: [], progDefault: 'linear' }
    applyProfile(S, { ...full, trainingGoal: 'bulking' }, NOW)
    applyProfile(S, { ...full, trainingGoal: 'maintain' }, NOW + 1)
    expect(S.progDefault).toBe('linear')
    const manual = { unit: 'kg', bodyweight: [], progDefault: 'triple', progManual: true }
    applyProfile(manual, { ...full, trainingGoal: 'bulking' }, NOW)
    expect(manual.progDefault).toBe('triple')
    const other = { unit: 'kg', bodyweight: [], progDefault: 'greyskull' }
    applyProfile(other, { ...full, trainingGoal: 'bulking' }, NOW)
    expect(other.progDefault).toBe('greyskull')
  })
  it('round-trips the muscle preferences into the recommender profile', () => {
    const S = { unit: 'kg', bodyweight: [] }
    applyProfile(S, { ...full, muscleFocus: ['chest', 'zzz'], muscleLess: ['calves'] }, NOW)
    expect(S.muscleFocus).toEqual(['chest'])
    expect(draftFromState(S).muscleLess).toEqual(['calves'])
    expect(recommenderProfile(S)).toMatchObject({ focus: ['chest'], less: ['calves'] })
  })
})

describe('profile helpers', () => {
  it('reports the first and latest weigh-in', () => {
    const S = { bodyweight: [{ d: '2026-02-01', w: 80 }, { d: '2026-01-01', w: 84 }] }
    expect(weightProgress(S)).toMatchObject({ start: { w: 84 }, now: { w: 80 }, delta: -4 })
    expect(weightProgress({ bodyweight: [] })).toBeNull()
  })

  it('hands the saved profile to the recommender as it is', () => {
    expect(recommenderProfile({ gender: 'male', daysAvailable: 4, trainingGoal: 'bulking', experience: 'advanced', bodyType: 'easy_to_gain', injuries: ['knee'] }))
      .toEqual({ gender: 'male', daysAvailable: 4, goal: 'bulking', experience: 'advanced', bodyType: 'easy_to_gain', injuries: ['knee'] })
    expect(recommenderProfile({}).injuries).toEqual([])
  })

  it('validates ranges and converts heights', () => {
    expect(validateDraft({ age: 5, weight: 70, height: 170 })).toEqual({ age: false, weight: true, height: true })
    expect(cmToDisplay(254, 'lb')).toBe(100)
    expect(displayToCm(100, 'lb')).toBe(254)
  })
})
