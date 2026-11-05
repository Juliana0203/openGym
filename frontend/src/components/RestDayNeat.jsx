// Rest-day card on Home: light activity (NEAT) instead of a day on the sofa. Pills, not tasks:
// nothing to tick and nothing stored (lib/neat.js picks them from the profile).
import { t } from '../lib/i18n.js'
import { neatPills } from '../lib/neat.js'

const PILL = {
  walk: min => t('Easy walk, {0} min', min),
  'walk-gentle': min => t('Gentle, flat walk, {0} min', min),
  mobility: min => t('Joint mobility, {0} min', min),
  stretch: min => t('Stretching at home, {0} min', min),
  'stand-up': min => t('Stand up and move, {0} min', min)
}

export default function RestDayNeat({ S }) {
  return <div className="card neat-card" data-neat>
    <div className="eyebrow muted small">{t('Active recovery')}</div>
    <div className="neat-title">{t('Rest day, not a still day')}</div>
    <div className="muted small">{t('Light movement helps you recover and keeps the day from going sedentary.')}</div>
    <div className="chips neat-pills">
      {neatPills(S).map(p => <span key={p.id} className="chip nocap">{PILL[p.id](p.min)}</span>)}
    </div>
  </div>
}
