// #303: an instance-wide default language, and the browser's, apply only to a copy nobody has
// picked a language for — never to an existing profile, whose `lang: 'en'` may be a choice.
import { describe, expect, it } from 'vitest'
import { matchLocale, autoLang } from './default-lang.js'

describe('matchLocale', () => {
  it('matches the full tag first, in any case or separator', () => {
    expect(matchLocale('es')).toBe('es')
    expect(matchLocale(' EN ')).toBe('en')
  })
  it('falls back to the base language, and to nothing for one the app does not have', () => {
    expect(matchLocale('es-MX')).toBe('es')
    expect(matchLocale('en-US')).toBe('en')
    expect(matchLocale('de-AT')).toBe(null)
    expect(matchLocale('pt-BR')).toBe(null)
    expect(matchLocale('')).toBe(null)
    expect(matchLocale(undefined)).toBe(null)
  })
})

describe('autoLang', () => {
  const fresh = { lang: 'en', langAuto: true }
  it('leaves a copy alone that chose, or that predates the mark', () => {
    expect(autoLang({ lang: 'en' }, { default_lang: 'es' }, ['es-ES'])).toBe(null)
    expect(autoLang({ lang: 'en', langAuto: false }, { default_lang: 'es' }, ['es-ES'])).toBe(null)
  })
  it('puts DEFAULT_LANG before the browser, the browser before English', () => {
    expect(autoLang(fresh, { default_lang: 'es' }, ['en-US'])).toBe('es')
    expect(autoLang(fresh, {}, ['de-DE', 'es-ES'])).toBe('es')
    expect(autoLang(fresh, {}, ['de-DE'])).toBe('en')
    expect(autoLang(fresh, { default_lang: 'xx' }, ['es-MX'])).toBe('es')
  })
})
