// The two guided blocks of a session (lib/prepBlocks.js): a short mobility warm-up before the
// first set and a stretch for the muscles worked after the last one. Both are optional: Start walks
// through the moves with a countdown, Skip puts the block away for this session.
import { useEffect, useState } from 'react'
import { t } from '../lib/i18n.js'
import { warmupFor, cooldownFor } from '../lib/prepBlocks.js'
import { Button } from './ui.jsx'
import Icon from './Icon.jsx'

const WARMUP_NAME = () => ({
  march: t('Easy march in place'), 'arm-circles': t('Arm circles'), 'shoulder-rolls': t('Shoulder rolls'),
  'cat-cow': t('Cat-cow'), 'thoracic-rotation': t('Open-book rotation'), 'scap-pushup': t('Scapular push-ups'),
  'hip-circles': t('Hip circles'), 'leg-swings': t('Leg swings'), 'bodyweight-squat': t('Bodyweight squats'),
  'lunge-rotation': t('Lunge with a twist'), 'glute-bridge': t('Glute bridges'), 'worlds-greatest': t('World’s greatest stretch')
})
const STRETCH_NAME = () => ({
  'doorway-chest': t('Doorway chest stretch'), 'lat-stretch': t('Lat stretch on a support'), 'cross-body-shoulder': t('Cross-body shoulder stretch'),
  'wall-biceps': t('Biceps stretch on a wall'), 'overhead-triceps': t('Overhead triceps stretch'), cobra: t('Cobra stretch'),
  'knees-to-chest': t('Knees to chest'), 'figure-four': t('Figure-four glute stretch'), 'standing-quad': t('Standing quad stretch'),
  'seated-hamstring': t('Seated hamstring stretch'), 'wall-calf': t('Calf stretch on a wall')
})

const clock = sec => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0')

export default function PrepBlock({ kind, entries, onDone }) {
  const pre = kind === 'pre'
  const { moves, sec } = pre ? warmupFor(entries) : cooldownFor(entries)
  const names = pre ? WARMUP_NAME() : STRETCH_NAME()
  const [running, setRunning] = useState(false)
  const [i, setI] = useState(0)
  const [left, setLeft] = useState(0)

  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(() => setLeft(l => l - 1), 1000)
    return () => clearInterval(id)
  }, [running, i])

  const next = () => {
    if (i + 1 >= moves.length) { setRunning(false); onDone() } else { setI(i + 1); setLeft(moves[i + 1].sec) }
  }
  useEffect(() => { if (running && left <= 0) next() }) // eslint-disable-line react-hooks/exhaustive-deps

  if (!moves.length) return null
  const start = () => { setI(0); setLeft(moves[0].sec); setRunning(true) }
  const title = pre ? t('Warm-up and mobility') : t('Cool-down stretch')
  const about = pre ? t('Easy and controlled, no pain. Then the first set.') : t('Hold each one and breathe. Do both sides.')
  const cur = moves[i]

  return <section className="prepblock card" data-prep={kind} aria-label={title}>
    <div className="prepblock-hd">
      <Icon name={pre ? 'sunrise' : 'moon'} />
      <div className="prepblock-t"><div className="prepblock-title">{title}</div>
        <div className="muted small">{t('{0} min', Math.max(1, Math.round(sec / 60)))} · {about}</div></div>
    </div>
    {running
      ? <div className="prepblock-run" aria-live="polite">
        <div className="muted small">{t('Move {0} of {1}', i + 1, moves.length)}</div>
        <div className="prepblock-move">{names[cur.id]}</div>
        <div className="prepblock-clock" aria-label={t('{0} seconds left', Math.max(0, left))}>{clock(Math.max(0, left))}</div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <Button size="sm" variant="primary" onClick={next}>{t('Next')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setRunning(false)}>{t('Stop')}</Button>
        </div>
      </div>
      : <>
        <ul className="prepblock-list">
          {moves.map(m => <li key={m.id}><span>{names[m.id]}</span><span className="muted small">{m.sec} s</span></li>)}
        </ul>
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" variant="primary" onClick={start}>{t('Start')}</Button>
          <Button size="sm" variant="ghost" onClick={onDone}>{pre ? t('Skip') : t('Done')}</Button>
        </div>
      </>}
  </section>
}
