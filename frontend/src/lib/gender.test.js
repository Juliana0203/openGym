import { describe, it, expect } from 'vitest'
import { GENDERS, genderOf } from './gender.js'

describe('genderOf', () => {
  it('returns the three supported values', () => {
    GENDERS.forEach(g => expect(genderOf({ gender: g })).toBe(g))
  })
  it('reads anything else as unset', () => {
    for (const S of [undefined, null, {}, { gender: null }, { gender: '' }, { gender: 'x' }]) expect(genderOf(S)).toBeNull()
  })
})
