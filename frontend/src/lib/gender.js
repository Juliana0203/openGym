// Optional profile field (S.gender). Nothing reads it yet: it is stored so a later change can tune
// the automatic volume per muscle group. Anything unknown reads as unset.
export const GENDERS = ['male', 'female', 'other']

export const genderOf = S => (GENDERS.includes(S?.gender) ? S.gender : null)
