import { describe, it, expect, afterEach } from 'vitest'
import { t, tn, _setLangState } from './i18n-core.js'
import es from '../locales/es.js'

// A pack with one / few / many forms, to keep the machinery covered although the app ships
// only English and Spanish: tn() still understands such a pack if one is ever added.
const manyForms = {
  '{0} exercises': { one: '{0} uno', few: '{0} pocos', many: '{0} muchos', other: '{0} otros' },
}

describe('tn() — plural forms from the pack', () => {
  afterEach(() => _setLangState('en', {}, null, null))

  it('falls back to the English two-form split with no pack', () => {
    _setLangState('en', {}, null, null)
    expect(tn('{0} exercise', '{0} exercises', 1)).toBe('1 exercise')
    expect(tn('{0} exercise', '{0} exercises', 2)).toBe('2 exercises')
    expect(tn('{0} exercise', '{0} exercises', 0)).toBe('0 exercises')
  })

  it('leaves a pack that answers with a plain string exactly as it was', () => {
    _setLangState('es', es, null, null)
    expect(tn('{0} exercise', '{0} exercises', 1)).toBe(es['{0} exercise'].replace('{0}', 1))
    expect(tn('{0} exercise', '{0} exercises', 7)).toBe(es['{0} exercises'].replace('{0}', 7))
  })

  it('picks one / few / many forms from a pack that declares them', () => {
    _setLangState('es', manyForms, null, null)
    const ex = n => tn('{0} exercise', '{0} exercises', n)
    expect(ex(1)).toBe('1 uno')
    expect(ex(5)).toBe('5 otros')
  })

  it('does not crash when a plural key is read through plain t()', () => {
    _setLangState('es', es, null, null)
    expect(typeof t('{0} exercises', 5)).toBe('string')
  })
})
