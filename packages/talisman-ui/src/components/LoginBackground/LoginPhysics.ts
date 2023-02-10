export type LoginPhysics = {
  artifacts: number
  blur: number
  opacityMin: number
  opacityMax: number
  durationMin: number
  durationMax: number
  radiusMin: number
  radiusMax: number
  ellipsisRatio: number
}

export const LOGIN_PHYSICS: LoginPhysics = {
  artifacts: 4,
  blur: 24,
  opacityMin: 0.2,
  opacityMax: 0.4,
  durationMin: 8000,
  durationMax: 15000,
  radiusMin: 0.4,
  radiusMax: 0.7,
  ellipsisRatio: 0.4,
}
