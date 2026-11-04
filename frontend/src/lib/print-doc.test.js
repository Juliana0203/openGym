// The shared printout shell (lib/print-doc.js).
import { afterEach, describe, expect, it } from 'vitest'
import { esc, paperFor, pageNumberContent, printShell, probeMarks, LOGO_SVG } from './print-doc.js'
import { _setLangState } from './i18n-core.js'

afterEach(() => _setLangState('en', {}, null, null))

describe('print-doc', () => {
  it('escapes what it prints', () => {
    expect(esc('<b>"A&B"</b>')).toBe('&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;')
  })

  it('starts the print sheet on Letter where people use it, A4 everywhere else', () => {
    expect(paperFor('en-US')).toBe('letter')
    expect(paperFor('es_MX')).toBe('letter')
    expect(paperFor('en-GB')).toBe('a4')
    expect(paperFor('de')).toBe('a4')
    expect(paperFor('')).toBe('a4')
  })

  it('builds the page-number line from the translation, numbers anywhere in it', () => {
    expect(pageNumberContent()).toBe('"Page " counter(page) " of " counter(pages)')
    _setLangState('es', { 'Page {0} of {1}': '{1} pág. de {0}' }, null, null)
    expect(pageNumberContent()).toBe('counter(pages) " pág. de " counter(page)')
    _setLangState('es', { 'Page {0} of {1}': 'Pág "{0}" \\ {1}' }, null, null)
    expect(pageNumberContent()).toBe('"Pág \\"" counter(page) "\\" \\\\ " counter(pages)')
  })

  it('a page: logo, title, facts, owner and date', () => {
    const html = printShell({ title: 'Leg <day>', kicker: 'Routine', facts: ['3 exercises', '', 'x'], owner: 'Ana', date: '2026-10-15', body: '<p>b</p>' })
    expect(html).toContain(LOGO_SVG)
    expect(html).toContain('<title>Leg &lt;day&gt;</title>')
    expect(html).toContain('<div class="facts">3 exercises<span class="dot">·</span>x</div>')
    expect(html).toContain('<b>Ana</b>')
    expect(html).toContain('dir="ltr"')
  })

  it('probe marks only when asked', () => {
    expect(probeMarks(false).s('a')).toBe('')
    expect(probeMarks(true).s('a b')).toBe('<i class="probe">~s:a_b~</i>')
  })
})
