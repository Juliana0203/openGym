import { describe, expect, it } from 'vitest'
import { EXIDX } from './exercises.js'
import { SWAP_PATTERNS, equipmentClassOf, movementPatternOf, swapAlternatives } from './biomechanicSwap.js'

const ids = list => list.map(a => a.ex.id)

describe('biomechanicSwap', () => {
  it('every reviewed id exists in the catalogue', () => {
    for (const { ids: list } of Object.values(SWAP_PATTERNS)) for (const id of list) expect(EXIDX[id], id).toBeTruthy()
  })

  it('a busy lat pulldown offers pull-ups, a one-arm dumbbell row and a pullover', () => {
    const out = swapAlternatives(EXIDX['0198'])
    expect(ids(out)).toEqual(['0652', '0292', '0375'])
    expect(out.map(a => a.equipment)).toEqual(['bodyweight', 'dumbbell', 'dumbbell'])
    expect(new Set(out.map(a => a.muscle))).toEqual(new Set(['lats']))
  })

  it('a low cable row keeps the back muscles and changes the equipment', () => {
    const out = swapAlternatives(EXIDX['0180'])
    expect(out.length).toBeGreaterThan(1)
    for (const a of out) {
      expect(a.muscle).toBe('upper back')
      expect(EXIDX[a.ex.id].tg).toBe('upper back')
      expect(a.equipment).not.toBe('machine')
    }
  })

  it('a leg extension machine keeps the quads', () => {
    const out = swapAlternatives(EXIDX['0585'])
    expect(out.length).toBeGreaterThan(1)
    for (const a of out) {
      expect(a.muscle).toBe('quads')
      expect(a.ex.tg).toBe('quads')
      expect(a.ex.id).not.toBe('0585')
    }
  })

  it('respects the equipment filter, the exclude list and the limit', () => {
    expect(swapAlternatives(EXIDX['0198'], { equipment: ['dumbbell'] }).every(a => a.equipment === 'dumbbell')).toBe(true)
    expect(ids(swapAlternatives(EXIDX['0198'], { exclude: ['0652'] }))).not.toContain('0652')
    expect(swapAlternatives(EXIDX['0198'], { limit: 2 })).toHaveLength(2)
  })

  it('returns nothing for unknown or custom exercises', () => {
    expect(swapAlternatives({ id: 'custom-1', custom: true, eq: 'cable' })).toEqual([])
    expect(swapAlternatives(null)).toEqual([])
    expect(movementPatternOf(EXIDX['0198'])).toBe('vertical pull')
    expect(equipmentClassOf(EXIDX['0652'])).toBe('bodyweight')
  })
})
