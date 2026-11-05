import { describe, it, expect } from 'vitest'
import { momentOf, pickLine, lastRatedRir, hardStreak, pickSpark, allLines } from './motivation.js'

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

describe('moments', () => {
  it('flavours the closing line by goal and spots a hard block', () => {
    expect(momentOf({ done: 6, total: 6, goal: 'strength' })).toBe('doneStrength')
    expect(momentOf({ done: 6, total: 6, goal: 'bulking' })).toBe('doneSize')
    expect(momentOf({ done: 6, total: 6, goal: 'maintain' })).toBe('done')
    expect(momentOf({ done: 4, total: 8, lastRir: 0, hardRun: 3 })).toBe('block')
    expect(momentOf({ done: 4, total: 8, lastRir: 0, hardRun: 2 })).toBe('hard')
  })
  it('counts the hard sets in a row at the end', () => {
    const e = [{ sets: [{ done: true, rir: 3 }, { done: true, rir: 1 }, { done: true, rir: 0 }, { done: true, rpe: 9 }] }]
    expect(hardStreak(e)).toBe(3)
    expect(hardStreak([])).toBe(0)
  })
})

describe('pickSpark', () => {
  it('uses the rest-day pool on a rest day and the daily pool otherwise', () => {
    expect(pickSpark({ rest: true }, '2026-11-04').moment).toBe('rest')
    expect(pickSpark({}, '2026-11-04').moment).toBe('daily')
  })
  it('is stable for a seed and never repeats the line to avoid', () => {
    for (const rest of [true, false]) {
      for (let d = 1; d <= 30; d++) {
        const seed = '2026-11-' + String(d).padStart(2, '0')
        const a = pickSpark({ rest }, seed)
        expect(pickSpark({ rest }, seed)).toEqual(a)
        expect(pickSpark({ rest }, seed, a.text).text).not.toBe(a.text)
      }
    }
  })
})

describe('the lines', () => {
  it('has no duplicates across pools and no em dashes', () => {
    const lines = allLines()
    expect(new Set(lines).size).toBe(lines.length)
    for (const l of lines) expect(l).not.toMatch(/\u2014/)
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
