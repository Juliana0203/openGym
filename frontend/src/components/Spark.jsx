// One quiet line of motivation on Home: a rest-day line on a rest day, a start-of-day line on a
// training day. The pick is seeded by the date and never repeats the previous day's line
// (lib/motivation.js pickSpark), so it needs no storage.
import { pickSpark } from '../lib/motivation.js'
import { todayISO, isoOf } from '../lib/format.js'

export default function Spark ({ rest = false }) {
  const today = todayISO()
  const d = new Date(today + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  const yesterday = pickSpark({ rest }, isoOf(d)).text
  const { text } = pickSpark({ rest }, today, yesterday)
  return <div className="spark muted small" data-spark>{text}</div>
}
