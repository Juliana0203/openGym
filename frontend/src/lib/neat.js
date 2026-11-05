// Light-activity ideas for a rest day (NEAT: the movement you do outside the gym). Recovery is
// active, not a day on the sofa. Pure picking; the wording is in components/RestDayNeat.jsx.
// [id, minutes]. A sedentary profile and a weight-loss goal both lean towards more walking.

const LOWER_BODY_INJURIES = ['hip', 'knee', 'ankle', 'lower_back']

/** The pills for a rest day, 3 or 4: [{ id, min }]. */
export function neatPills(S = {}) {
  const sedentary = S.activityLevel === 'sedentary'
  const lose = S.trainingGoal === 'lose_weight'
  const walk = lose && sedentary ? 30 : lose || sedentary ? 25 : 20
  const gentle = (Array.isArray(S.injuries) ? S.injuries : []).some(i => LOWER_BODY_INJURIES.includes(i))
  const pills = [
    { id: gentle ? 'walk-gentle' : 'walk', min: walk },
    { id: 'mobility', min: 10 },
    { id: 'stretch', min: 15 }
  ]
  if (sedentary) pills.push({ id: 'stand-up', min: 5 })
  return pills
}
