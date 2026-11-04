// Short lines for the workout screen, picked from the state of the session and the last
// effort logged. No randomness at render time: the pick is a hash of the seed (the session)
// and the count of sets done, so the line holds still between re-renders and changes only when
// the session moves on. Every line is a literal t() call, so the locale checks see them.
import { t } from './i18n.js'
import { rirOf } from './effort.js'

const POOLS = {
  start: [
    () => t('Show up first. The rest follows.'),
    () => t('One good set, then another.'),
    () => t('The plan is set. Just execute it.')
  ],
  middle: [
    () => t('Keep the rest honest.'),
    () => t('Same form on the last rep as the first.'),
    () => t('Quality reps. Nothing else counts.')
  ],
  // The last logged set went to failure or one rep short of it.
  hard: [
    () => t('That was real work. Take your rest.'),
    () => t('Hard set banked. Recover before the next.'),
    () => t('Close to the limit. Let the weight wait a moment.')
  ],
  // The last logged set had three or more reps left.
  easy: [
    () => t('Plenty left. Add weight next time.'),
    () => t('That looked light. Push the next one.'),
    () => t('Room to grow. Take the next set closer to the edge.')
  ],
  done: [
    () => t('Session complete. This is how it adds up.'),
    () => t('Done. The next one starts easier.'),
    () => t('Every session counts. This one did.')
  ]
}

const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) }

/** The last set the lifter rated in this session, as RIR, or null. */
export function lastRatedRir (entries) {
  let last = null
  for (const e of Array.isArray(entries) ? entries : []) {
    for (const s of Array.isArray(e?.sets) ? e.sets : []) {
      if (!s || !s.done || s.warmup) continue
      const r = rirOf(s)
      if (r != null) last = r
    }
  }
  return last
}

/** Which pool fits the session right now. */
export function momentOf ({ done = 0, total = 0, lastRir = null } = {}) {
  if (total > 0 && done >= total) return 'done'
  if (done === 0) return 'start'
  if (lastRir != null && lastRir <= 1) return 'hard'
  if (lastRir != null && lastRir >= 3) return 'easy'
  return 'middle'
}

/** { moment, text } for a session. `seed` makes the pick stable for that session. */
export function pickLine (ctx, seed = '') {
  const moment = momentOf(ctx)
  const pool = POOLS[moment]
  const i = hash(seed + ':' + moment + ':' + (ctx?.done || 0)) % pool.length
  return { moment, text: pool[i]() }
}
