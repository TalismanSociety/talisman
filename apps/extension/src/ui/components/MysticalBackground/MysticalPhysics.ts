export type MysticalPhysics = {
  artifacts: number
  blur: number
  opacityMin: number
  opacityMax: number
  durationMin: number
  durationMax: number
  radiusMin: number
  radiusMax: number
  ellipsisRatio: number
  colors?: string[]
}

export const MYSTICAL_PHYSICS: MysticalPhysics = {
  artifacts: 3,
  blur: 0,
  opacityMin: 0.2,
  opacityMax: 0.4,
  durationMin: 8000,
  durationMax: 15000,
  radiusMin: 0.4,
  radiusMax: 1,
  ellipsisRatio: 0.6,
}
