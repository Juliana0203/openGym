import { pickLine, lastRatedRir } from '../lib/motivation.js'
import { streakInfo } from '../lib/streak.js'
import { t } from '../lib/i18n.js'

/* One quiet line under the session progress bar: a short phrase for the moment the session is in
   and, once there is a streak, the weeks in a row. Nothing here blocks or animates. */
export default function MotivationLine ({ S, active, done, total }) {
  const { text } = pickLine({ done, total, lastRir: lastRatedRir(active?.entries) }, active?.id || active?.start || active?.d || 'session')
  const weeks = streakInfo(S).current
  return (
    <div className="wmotive muted small" data-motivation>
      <span>{text}</span>
      {weeks > 0 && <span className="wmotive-streak">{t('{0}-week streak', weeks)}</span>}
    </div>
  )
}
