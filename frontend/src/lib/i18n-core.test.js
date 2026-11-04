import { describe, it, expect } from 'vitest'
import {
  LANGS, INSTR_LANGS, EXERCISE_NAME_LANGS, DATE_LOCALES, DERIVED_LOCALES,
  baseLang, derivePack, dateLocale, getLang, _setLangState, exerciseNameClass, exerciseNameFor, CASED_NAME_LANGS, RTL_LANGS
} from './i18n-core.js'
import { EXDB } from './exercises-data.js'

describe('supported languages', () => {
  it('offers English and Spanish only', () => {
    expect(Object.keys(LANGS)).toEqual(['en', 'es'])
    expect(Object.keys(DATE_LOCALES).sort()).toEqual(['en', 'es'])
    expect(RTL_LANGS.size).toBe(0)
    expect(Object.keys(DERIVED_LOCALES)).toEqual([])
  })

  it('switches the active language and its date locale', () => {
    _setLangState('es', {}, null, null)
    expect(getLang()).toBe('es')
    expect(dateLocale()).toBe(DATE_LOCALES.es)
    _setLangState('en', {}, null, null)
  })
})

describe('baseLang', () => {
  it('leaves every language as itself when none is derived', () => {
    expect(baseLang('es')).toBe('es')
    expect(baseLang('en')).toBe('en')
    expect(baseLang('nonsense')).toBe('nonsense')
  })
})

describe('derivePack', () => {
  it('returns the pack untouched for a language that is not derived', () => {
    const pack = { a: 'Gesäß' }
    expect(derivePack('es', pack)).toBe(pack)
    expect(derivePack('en', pack)).toBe(pack)
  })

  it('passes a null pack through', () => {
    expect(derivePack('es', null)).toBe(null)
  })
})

// EXDB stores English names lower-case and the UI title-cases them with CSS. A pack with its own
// casing must not get it applied on top.
describe('exerciseNameClass', () => {
  const bench = { id: '0025', n: 'barbell bench press' }
  const pushUp = { id: '0662', n: 'push-up' }
  const custom = { id: 'custom-1', n: 'my own press' }

  it('title-cases only while the English fallback is showing', () => {
    _setLangState('en', {}, null, null)
    expect(exerciseNameClass(bench)).toBe('capitalize')
    _setLangState('es', {}, null, null)
    expect(exerciseNameClass(bench)).toBe('capitalize')
    _setLangState('es', {}, null, { '0025': 'Press de banca con barra' })
    expect(exerciseNameClass(bench)).toBe(CASED_NAME_LANGS.includes('es') ? '' : 'capitalize')
    _setLangState('en', {}, null, null)
  })

  it('decides per exercise, so an untranslated one in a partial pack keeps its casing', () => {
    _setLangState('es', {}, null, { '0025': 'Press de banca con barra' })
    expect(exerciseNameClass(pushUp)).toBe('capitalize')
    expect(exerciseNameClass(custom)).toBe('capitalize')
    expect(exerciseNameClass(undefined)).toBe('capitalize')
    _setLangState('en', {}, null, null)
  })
})

describe('title-casing per exercise-name pack', () => {
  const packs = import.meta.glob('../exercise-names/*.js', { eager: true, import: 'default' })
  const packFor = lang => packs[`../exercise-names/${lang}.js`]
  const lowerShare = names => {
    const firsts = Object.values(names).map(n => [...n][0]).filter(Boolean)
    return firsts.filter(c => c === c.toLocaleLowerCase()).length / firsts.length
  }

  it('lists exactly the packs written in their own casing', () => {
    for (const lang of EXERCISE_NAME_LANGS) {
      expect(CASED_NAME_LANGS.includes(lang), `${lang}: ${Math.round(lowerShare(packFor(lang)) * 100)}% lower-case`)
        .toBe(lowerShare(packFor(lang)) < 0.5)
    }
    for (const lang of CASED_NAME_LANGS) expect(EXERCISE_NAME_LANGS, lang).toContain(lang)
  })

  for (const lang of ['es']) {
    const cased = CASED_NAME_LANGS.includes(baseLang(lang))
    it(`${lang}: a translated name is ${cased ? 'left in its own casing' : 'title-cased like English'}`, () => {
      const names = packFor(baseLang(lang))
      const translated = EXDB.filter(e => names[e.id])
      _setLangState(lang, {}, null, names)
      for (const ex of translated) expect(exerciseNameClass(ex), `${lang} ${ex.id}`).toBe(cased ? '' : 'capitalize')
      const untranslated = EXDB.find(e => !names[e.id])
      if (untranslated) expect(exerciseNameClass(untranslated)).toBe('capitalize')
      _setLangState('en', {}, null, null)
    })
  }
})

describe('English-name switches with the Spanish exercise-name pack', () => {
  const packs = import.meta.glob('../exercise-names/*.js', { eager: true, import: 'default' })
  const names = packs['../exercise-names/es.js']

  it('ships a pack for Spanish and lists it', () => {
    expect(names).toBeTruthy()
    expect(EXERCISE_NAME_LANGS).toContain('es')
    expect(INSTR_LANGS).toContain('es')
  })

  it('parentheses off shows the translation alone, English only shows the English title', () => {
    const ex = EXDB.find(e => names[e.id] && names[e.id].toLocaleLowerCase('es') !== e.n.toLocaleLowerCase('en'))
    expect(ex).toBeTruthy()
    const translatedClass = CASED_NAME_LANGS.includes('es') ? '' : 'capitalize'
    _setLangState('es', {}, null, names)
    expect(exerciseNameFor(ex)).toBe(`${names[ex.id]} (${ex.n})`)
    expect(exerciseNameClass(ex)).toBe(translatedClass)
    _setLangState('es', {}, null, names, false)
    expect(exerciseNameFor(ex)).toBe(names[ex.id])
    expect(exerciseNameClass(ex)).toBe(translatedClass)
    _setLangState('es', {}, null, names, true, true)
    expect(exerciseNameFor(ex)).toBe(ex.n)
    expect(exerciseNameClass(ex)).toBe('capitalize')
    _setLangState('en', {}, null, null)
  })

  it('an exercise the pack does not cover is unaffected by either switch', () => {
    const ex = EXDB.find(e => !names[e.id])
    if (!ex) return
    for (const [showEn, enOnly] of [[true, false], [false, false], [true, true]]) {
      _setLangState('es', {}, null, names, showEn, enOnly)
      expect(exerciseNameFor(ex)).toBe(ex.n)
      expect(exerciseNameClass(ex)).toBe('capitalize')
    }
    _setLangState('en', {}, null, null)
  })
})
