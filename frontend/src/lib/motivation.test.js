import { describe, it, expect } from 'vitest'
import { momentOf, pickLine, lastRatedRir } from './motivation.js'

describe('momentOf', () => {
  it('follows the state of the session', () => {
    expect(momentOf({ done: 0, total: 6 })).toBe('start')
    expect(momentOf({ done: 2, total: 6 })).toBe('middle')
    expect(momentOf({ done: 6, total: 6 })).toBe('done')
  })
  it('reads the last rated set', () => {
    expect(momentOf({ done: 2, total: 6, lastRir: 0 })).toBe('hard')
    expect(momentOf({ done: 2, total: 6, lastRir: 1 })).toBe('hard')
    expect(momentOf({ done: 2, total: 6, lastRir: 2 })).toBe('middle')
    expect(momentOf({ done: 2, total: 6, lastRir: 3 })).toBe('easy')
  })
})

describe('pickLine', () => {
  it('is stable for the same session and moment', () => {
    const a = pickLine({ done: 2, total: 6, lastRir: 0 }, 's1')
    const b = pickLine({ done: 2, total: 6, lastRir: 0 }, 's1')
    expect(a).toEqual(b)
    expect(a.text.length).toBeGreaterThan(0)
    expect(a.text).not.toMatch(/\u2014/)
  })
})

describe('lastRatedRir', () => {
  it('takes the latest done, non-warmup set that carries an effort', () => {
    const entries = [
      { sets: [{ done: true, rir: 3 }, { done: true, warmup: true, rir: 0 }] },
      { sets: [{ done: true, rpe: 9 }, { done: false, rir: 4 }, { done: true }] }
    ]
    expect(lastRatedRir(entries)).toBe(1)
    expect(lastRatedRir([])).toBe(null)
  })
})
