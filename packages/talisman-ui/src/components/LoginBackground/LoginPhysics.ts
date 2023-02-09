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
  artifacts: 6,
  blur: 24,
  opacityMin: 0.3,
  opacityMax: 0.5,
  durationMin: 8000,
  durationMax: 15000,
  radiusMin: 0.2,
  radiusMax: 0.5,
  ellipsisRatio: 0.4,
}
