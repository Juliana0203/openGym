import { describe, it, expect } from 'vitest'
import { autoRegulate, autoRegulateFor, targetRirOf, withTargetRir } from './autoRegulation.js'

describe('targetRir per exercise', () => {
  it('defaults to 2 when unset or invalid', () => {
    expect(targetRirOf({})).toBe(2)
    expect(targetRirOf(null)).toBe(2)
    expect(targetRirOf({ targetRir: 9 })).toBe(2)
    expect(targetRirOf({ targetRir: '1' })).toBe(2)
    expect(targetRirOf({ targetRir: 0 })).toBe(0)
    expect(targetRirOf({ targetRir: 4 })).toBe(4)
  })
  it('withTargetRir stores only non-default values and keeps the rest of the config', () => {
    expect(withTargetRir({ reps: 8 }, 1)).toEqual({ reps: 8, targetRir: 1 })
    expect(withTargetRir({ reps: 8, targetRir: 1 }, 2)).toEqual({ reps: 8 })
    expect(withTargetRir({ reps: 8 }, 7)).toEqual({ reps: 8 })
  })
  it('judges a set against the exercise own target', () => {
    // RIR 1 is "too hard" against a target of 3, but on plan against a target of 1 or 2
    expect(autoRegulateFor({ targetRir: 3 }, 1, 100).action).toBe('decrease')
    expect(autoRegulateFor({ targetRir: 1 }, 1, 100).action).toBe('keep')
    expect(autoRegulateFor({}, 1, 100).action).toBe('keep')
    expect(autoRegulateFor({ targetRir: 0 }, 2, 100).action).toBe('increase')
  })
})

describe('autoRegulate', () => {
  it('keeps the load within one rep of the target or when unrated', () => {
    expect(autoRegulate(2, 1, 100).action).toBe('keep')
    expect(autoRegulate(2, 3, 100).action).toBe('keep')
    expect(autoRegulate(2, null, 100).action).toBe('keep')
    expect(autoRegulate(2, 0, 0).action).toBe('keep')
  })
  it('drops 5% for a clear miss and up to 10% for a big one', () => {
    const a = autoRegulate(3, 1, 100)
    expect(a).toMatchObject({ action: 'decrease', weight: 95, pct: 0.05 })
    expect(a.message).toMatch(/95/)
    expect(autoRegulate(4, 0, 100)).toMatchObject({ weight: 90, pct: 0.1 })
  })
  it('always moves at least one step', () => {
    expect(autoRegulate(3, 1, 20).weight).toBe(17.5)
    expect(autoRegulate(3, 1, 20, 2.5).weight).toBeLessThan(20)
  })
  it('raises 5% when it felt very easy', () => {
    expect(autoRegulate(1, 3, 100)).toMatchObject({ action: 'increase', weight: 105, pct: 0.05 })
    expect(autoRegulate(1, 3, 20).weight).toBe(22.5)
  })
})
