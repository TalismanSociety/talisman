export type MysticalPhysics = {
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

export const MYSTICAL_PHYSICS: MysticalPhysics = {
  blur: 0,
  minSizeArtifact: 0,
  minSizeAcolyte: 0.1,
  maxSizeArtifact: 4,
  maxSizeAcolyte: 1.4,
  minOpacityArtifact: 0.1,
  minOpacityAcolyte: 0.2,
  maxOpacityArtifact: 0.4,
  maxOpacityAcolyte: 0.5,
  stiffnessArtifact: 100,
  stiffnessAcolyte: 200,
  easeArtifact: "easeInOut",
  easeAcolyte: "easeOut",
  durationArtifact: 8,
  durationAcolyte: 10,
}
