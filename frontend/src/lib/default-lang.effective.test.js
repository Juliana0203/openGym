// @vitest-environment happy-dom
// effectiveLang: the language a copy is shown in on this device, and the cached instance default
// (rememberDefaultLang) that stands in for /api/config until it answers, so a boot does not flash
// the browser's language first.
import { beforeEach, describe, expect, it } from 'vitest'
import { effectiveLang, rememberDefaultLang, browserLangs } from './default-lang.js'

const auto = { lang: 'en', langAuto: true }

beforeEach(() => localStorage.clear())

describe('effectiveLang', () => {
  it('keeps a language somebody picked, whatever the instance or browser say', () => {
    expect(effectiveLang({ lang: 'es' }, { default_lang: 'en' }, ['en'])).toBe('es')
    expect(effectiveLang({ lang: 'en' }, { default_lang: 'es' }, ['es'])).toBe('en')
  })
  it('falls back to English for a copy with no usable lang', () => {
    expect(effectiveLang(null, null, ['de'])).toBe('en')
    expect(effectiveLang({ lang: '' }, null, [])).toBe('en')
  })
  it('gives an unpicked copy the instance default, then the browser\'s language', () => {
    expect(effectiveLang(auto, { default_lang: 'es' }, ['en'])).toBe('es')
    expect(effectiveLang(auto, { default_lang: '' }, ['es-ES'])).toBe('es')
    expect(effectiveLang(auto, { default_lang: '' }, ['nl'])).toBe('en')
  })
  it('before the config is in, uses the default this device saw last', () => {
    rememberDefaultLang({ default_lang: 'es' })
    expect(effectiveLang(auto, null, ['en'])).toBe('es')
  })
  it('reads a remembered "no default" as no default, not as unknown', () => {
    rememberDefaultLang({})
    expect(localStorage.getItem('gym_default_lang')).toBe('')
    expect(effectiveLang(auto, null, ['es'])).toBe('es')
  })
  it('with nothing seen yet, shows the stored language unchanged until the config answers', () => {
    expect(effectiveLang({ lang: 'es', langAuto: true }, null, ['en'])).toBe('es')
  })
})

describe('browserLangs', () => {
  it('lists navigator.languages without blanks', () => {
    const langs = browserLangs()
    expect(Array.isArray(langs)).toBe(true)
    expect(langs.every(Boolean)).toBe(true)
  })
})
