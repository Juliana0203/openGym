// @vitest-environment happy-dom
/* A start in another language than English loads three packs (the words, the exercise steps and
   the exercise names). They used to be awaited one after the other, three round trips before
   Home could draw; they are fetched side by side now, and still all land. */
import { describe, expect, it, vi } from 'vitest'

const log = vi.hoisted(() => [])
vi.mock('../locales/es.js', async () => {
  log.push('words')
  await new Promise(r => setTimeout(r, 30))
  log.push('words done')
  return { default: { Plan: 'Plan (es)' } }
})
vi.mock('../instr/es.js', () => { log.push('steps'); return { default: {} } })
vi.mock('../exercise-names/es.js', () => { log.push('names'); return { default: {} } })

import { setLang, t, getLang } from './i18n.js'

describe('setLang', () => {
  it('fetches the language packs side by side', async () => {
    await setLang('es')
    expect(getLang()).toBe('es')
    expect(t('Plan')).toBe('Plan (es)')
    expect(log.indexOf('steps')).toBeGreaterThan(-1)
    expect(log.indexOf('names')).toBeGreaterThan(-1)
    expect(log.indexOf('steps')).toBeLessThan(log.indexOf('words done'))
    expect(log.indexOf('names')).toBeLessThan(log.indexOf('words done'))
  })
})
