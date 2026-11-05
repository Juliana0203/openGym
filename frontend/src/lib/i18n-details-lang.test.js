/* The first details load and a language switch can overlap: setLang reloads the descriptions
   only once a load has finished, so one that started under German and finished under French
   used to put German descriptions under French. They are kept only for the language they were
   loaded for; the loader then loads the current language's own. */
import { describe, expect, it } from 'vitest'
import * as core from './i18n-core.js'

const ex = { id: '9999', st: [] }

describe('a language switch while the details load', () => {
  it('keeps the descriptions of one language from landing under another', () => {
    core._setLangState('es', {}, null, null, true, false)
    expect(core._setDetails({ 9999: ['Lift.'] }, { 9999: 'A lift.' }, { 9999: 'Un levante.' }, 'es')).toBe(true)
    expect(core.descFor(ex)).toBe('Un levante.')
    core._setLangState('en', {}, null, null, true, false)
    // Spanish descriptions that finished loading after the switch to English
    expect(core._setDetails({ 9999: ['Lift.'] }, { 9999: 'A lift.' }, { 9999: 'Un levante.' }, 'es')).toBe(false)
    expect(core.descFor(ex)).not.toBe('Un levante.')
    expect(core.instrFor(ex)).toEqual(['Lift.'])   // the English steps are every language's
    core._setLangState('es', {}, null, null, true, false)
    expect(core._setDetails(null, null, { 9999: 'Otro levante.' }, 'es')).toBe(true)
    expect(core.descFor(ex)).toBe('Otro levante.')
  })
})
