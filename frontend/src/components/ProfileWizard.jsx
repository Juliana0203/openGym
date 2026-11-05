// The baseline profile as a four-step sheet: basics, lifestyle, goal and days, then experience and
// limitations. Opened from the Home welcome card and from Settings (where it edits what is saved).
// It keeps a draft and writes once, at the end, through lib/profile.js.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import {
  INJURY_AREAS, MIN_DAYS, MAX_DAYS, applyProfile, draftFromState, heightUnit, validateDraft, profileDone, weightProgress
} from '../lib/profile.js'
import { fmtNum } from '../lib/format.js'
import { Button, Segmented, NumberField, TextArea } from './ui.jsx'

export const GENDER_LABEL = () => ({ male: t('Male'), female: t('Female'), other: t('Non-binary or other') })
export const ACTIVITY_LABEL = () => ({ sedentary: t('Mostly sitting'), moderate: t('On my feet some of the day'), active: t('Active all day') })
export const BODY_LABEL = () => ({ slim_hard_to_gain: t('Slim, hard to gain'), easy_to_gain: t('Gain easily'), athletic_balanced: t('Athletic, balanced') })
export const GOAL_LABEL = () => ({ lose_weight: t('Lose weight'), maintain: t('Maintain'), bulking: t('Build size'), strength: t('Get stronger') })
export const EXPERIENCE_LABEL = () => ({ beginner: t('Beginner'), intermediate: t('Intermediate'), advanced: t('Advanced') })
export const INJURY_LABEL = () => ({
  neck: t('Neck'), shoulder: t('Shoulder'), elbow: t('Elbow'), wrist: t('Wrist'),
  lower_back: t('Lower back'), hip: t('Hip'), knee: t('Knee'), ankle: t('Ankle')
})

const STEPS = 4

function Choice({ label, id, options, value, onChange }) {
  return <div style={{ marginBottom: 18 }}>
    <div className="about-lbl" id={id}>{label}</div>
    <div className="chips" role="group" aria-labelledby={id}>
      {options.map(o => <button key={o.value} type="button" className={'chip nocap' + (value === o.value ? ' on' : '')}
        aria-pressed={value === o.value} onClick={() => onChange(value === o.value ? null : o.value)}>{o.label}</button>)}
    </div>
  </div>
}

function Field({ label, unit, children, bad }) {
  return <label style={{ display: 'block', marginBottom: 14 }}>
    <div className="about-lbl">{label}{unit ? ' (' + unit + ')' : ''}</div>
    {children}
    {bad && <div className="small dim" style={{ marginTop: 4 }}>{t('That does not look right.')}</div>}
  </label>
}

function ProfileWizard({ close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [draft, setDraft] = useState(() => draftFromState(S))
  const [step, setStep] = useState(0)
  const set = patch => setDraft(d => ({ ...d, ...patch }))
  const unit = draft.unit
  const ok = validateDraft(draft, unit)
  const stepOk = step === 0 ? ok.age && ok.weight && ok.height : true
  const pick = map => Object.keys(map).map(value => ({ value, label: map[value] }))
  const finish = () => {
    update(s => { applyProfile(s, draft) })
    close()
    useUI.getState().toast(t('Profile saved'))
  }
  const toggleInjury = key => set({ injuries: draft.injuries.includes(key) ? draft.injuries.filter(k => k !== key) : [...draft.injuries, key] })

  return <>
    <h3>{t('Your profile')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Step {0} of {1}', step + 1, STEPS)}. {t('Everything is optional and stays on your account.')}</div>
    <div role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1}
      style={{ height: 4, borderRadius: 2, background: 'var(--sep)', marginBottom: 18, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: ((step + 1) / STEPS) * 100 + '%', background: 'var(--blue)', transition: 'width .2s' }} />
    </div>

    {step === 0 && <>
      <Choice label={t('Gender')} id="pf-gender" options={pick(GENDER_LABEL())} value={draft.gender} onChange={v => set({ gender: v })} />
      <Field label={t('Age')} bad={!ok.age}>
        <NumberField nullable decimal={false} value={draft.age} onChange={v => set({ age: v })} inputMode="numeric" />
      </Field>
      <Field label={t('Weight')} unit={unit} bad={!ok.weight}>
        <NumberField nullable value={draft.weight} onChange={v => set({ weight: v })} />
      </Field>
      <Field label={t('Height')} unit={heightUnit(unit)} bad={!ok.height}>
        <NumberField nullable value={draft.height} onChange={v => set({ height: v })} />
      </Field>
      <div className="small dim">{t('Your weight becomes the first point of your weight chart.')}</div>
    </>}

    {step === 1 && <>
      <Choice label={t('Daily activity')} id="pf-activity" options={pick(ACTIVITY_LABEL())}
        value={draft.activityLevel} onChange={v => set({ activityLevel: v })} />
      <Choice label={t('Body type')} id="pf-body" options={pick(BODY_LABEL())}
        value={draft.bodyType} onChange={v => set({ bodyType: v })} />
    </>}

    {step === 2 && <>
      <div className="about-lbl" id="pf-days">{t('Days a week I can train')}</div>
      <Segmented ariaLabelledby="pf-days" value={draft.daysAvailable} onChange={v => set({ daysAvailable: v })}
        options={Array.from({ length: MAX_DAYS - MIN_DAYS + 1 }, (_, i) => ({ value: MIN_DAYS + i, label: String(MIN_DAYS + i) }))} />
      <div style={{ height: 18 }} />
      <Choice label={t('Goal')} id="pf-goal" options={pick(GOAL_LABEL())}
        value={draft.trainingGoal} onChange={v => set({ trainingGoal: v })} />
    </>}

    {step === 3 && <>
      <Choice label={t('Experience')} id="pf-exp" options={pick(EXPERIENCE_LABEL())}
        value={draft.experience} onChange={v => set({ experience: v })} />
      <div className="about-lbl" id="pf-inj">{t('Injuries or aches')}</div>
      <div className="chips" role="group" aria-labelledby="pf-inj" style={{ marginBottom: 12 }}>
        {INJURY_AREAS.map(k => <button key={k} type="button" className={'chip nocap' + (draft.injuries.includes(k) ? ' on' : '')}
          aria-pressed={draft.injuries.includes(k)} onClick={() => toggleInjury(k)}>{INJURY_LABEL()[k]}</button>)}
      </div>
      <TextArea rows={3} maxLength={300} value={draft.injuriesNote} placeholder={t('Anything else to keep in mind (optional)')}
        onChange={e => set({ injuriesNote: e.target.value })} />
    </>}

    <div className="row" style={{ gap: 8, marginTop: 20, justifyContent: 'space-between' }}>
      {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}>{t('Back')}</Button> : <Button variant="ghost" onClick={close}>{t('Skip')}</Button>}
      {step < STEPS - 1
        ? <Button variant="primary" disabled={!stepOk} onClick={() => setStep(step + 1)}>{t('Next')}</Button>
        : <Button variant="primary" onClick={finish}>{t('Save')}</Button>}
    </div>
  </>
}

export const profileWizardSheet = () => useUI.getState().openSheet(close => <ProfileWizard close={close} />)

/** One line for the Settings row: goal and days, and the weight since the first weigh-in. */
export function profileSummary(S) {
  if (!profileDone(S)) return t('Answer a few questions to tailor your plan')
  const bits = []
  if (S.trainingGoal) bits.push(GOAL_LABEL()[S.trainingGoal])
  if (S.daysAvailable) bits.push(t('{0} days a week', S.daysAvailable))
  const p = weightProgress(S)
  if (p) bits.push(p.delta ? fmtNum(p.start.w) + ' → ' + fmtNum(p.now.w) + ' ' + (S.unit || 'kg') : fmtNum(p.now.w) + ' ' + (S.unit || 'kg'))
  return bits.join(' · ')
}
