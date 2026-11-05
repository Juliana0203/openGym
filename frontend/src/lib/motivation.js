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
  ],
  // Finished a session that was strength work (goal strength).
  doneStrength: [
    () => t('Heavy work done. Strength is built, not found.'),
    () => t('Stronger than when you walked in.'),
    () => t('Heavy and clean. That is the whole game.')
  ],
  // Finished a session of size work (goal bulking).
  doneSize: [
    () => t('Volume banked. Now eat and sleep on it.'),
    () => t('Muscle is built in the rest. Go recover.'),
    () => t('Every rep paid in. Let it grow.')
  ],
  // Three or more hard sets in a row: a tough block.
  block: [
    () => t('Tough block, and you stayed in it.'),
    () => t('That stretch was heavy. Breathe, then go again.'),
    () => t('Hard sets back to back. This is where it counts.')
  ],
  // A rest day: recovery is part of the plan.
  rest: [
    () => t('Rest is part of the plan. Move gently and recover.'),
    () => t('Today you grow. Walk, stretch, sleep.'),
    () => t('Easy day. Easy movement. Full recovery.')
  ],
  // First look of a training day, before the session.
  daily: [
    () => t('Today counts. Start small, finish strong.'),
    () => t('Show up. Do the work.'),
    () => t('Discipline beats motivation. Go train.')
  ]
}

const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) }

/** How many of the latest rated working sets in a row went to failure or one rep short of it. */
export function hardStreak (entries) {
  const rated = []
  for (const e of Array.isArray(entries) ? entries : []) {
    for (const s of Array.isArray(e?.sets) ? e.sets : []) {
      if (!s || !s.done || s.warmup) continue
      const r = rirOf(s)
      if (r != null) rated.push(r)
    }
  }
  let n = 0
  for (let i = rated.length - 1; i >= 0 && rated[i] <= 1; i--) n++
  return n
}

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

/** Which pool fits the session right now. `goal` (the profile's) flavours the closing line. */
export function momentOf ({ done = 0, total = 0, lastRir = null, hardRun = 0, goal = null } = {}) {
  if (total > 0 && done >= total) return goal === 'strength' ? 'doneStrength' : goal === 'bulking' ? 'doneSize' : 'done'
  if (done === 0) return 'start'
  if (hardRun >= 3) return 'block'
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

/**
 * The spark for Home: the rest-day line on a rest day (NEAT), the daily start line otherwise.
 * Stable for a seed (use the date), and never the same line as `avoid` (yesterday's), so two
 * days in a row do not read alike.
 */
export function pickSpark ({ rest = false } = {}, seed = '', avoid = null) {
  const moment = rest ? 'rest' : 'daily'
  const lines = POOLS[moment].map(f => f())
  const options = lines.filter(l => l !== avoid)
  const text = options[hash(seed + ':' + moment) % options.length]
  return { moment, text }
}

/** Every line of every pool, as text, for checks that none repeats. */
export const allLines = () => Object.values(POOLS).flat().map(f => f())
