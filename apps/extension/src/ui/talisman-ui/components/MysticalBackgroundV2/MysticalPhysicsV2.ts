export type MysticalPhysicsV2 = {
  blur: number
  minSizeArtifact: number
  minSizeAcolyte: number
  maxSizeArtifact: number
  maxSizeAcolyte: number
  minOpacityArtifact: number
  minOpacityAcolyte: number
  maxOpacityArtifact: number
  maxOpacityAcolyte: number
  stiffnessArtifact: number
  stiffnessAcolyte: number
  easeArtifact: "easeInOut" | "easeOut"
  easeAcolyte: "easeInOut" | "easeOut"
  durationArtifact: number
  durationAcolyte: number
}

export const MYSTICAL_PHYSICS_V2: MysticalPhysicsV2 = {
  blur: 0,
  minSizeArtifact: 0,
  minSizeAcolyte: 0.1,
  maxSizeArtifact: 4,
  maxSizeAcolyte: 1.4,
  minOpacityArtifact: 0.05,
  minOpacityAcolyte: 0.15,
  maxOpacityArtifact: 0.2,
  maxOpacityAcolyte: 0.3,
  stiffnessArtifact: 100,
  stiffnessAcolyte: 200,
  easeArtifact: "easeInOut",
  easeAcolyte: "easeOut",
  durationArtifact: 8,
  durationAcolyte: 10,
}
