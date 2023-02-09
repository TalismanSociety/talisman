export type LoginPhysics = {
  blur: number
  minOpacityArtifact: number
  maxOpacityArtifact: number
  stiffnessArtifact: number
  minDuration: number
  maxDuration: number
}

export const LOGIN_PHYSICS: LoginPhysics = {
  blur: 24,
  minOpacityArtifact: 0.2,
  maxOpacityArtifact: 0.4,
  stiffnessArtifact: 50,
  minDuration: 10,
  maxDuration: 20,
}
