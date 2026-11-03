import { describe, it, expect } from 'vitest'
import { autoRegulate } from './autoRegulation.js'

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
