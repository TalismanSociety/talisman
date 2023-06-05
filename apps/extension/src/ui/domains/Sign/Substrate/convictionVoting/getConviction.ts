import { Conviction } from "@polkadot/types/interfaces/democracy"

export const getConviction = (conviction?: Conviction) => {
  switch (conviction?.type) {
    case "Locked1x":
      return 1
    case "Locked2x":
      return 2
    case "Locked3x":
      return 3
    case "Locked4x":
      return 4
    case "Locked5x":
      return 5
    case "Locked6x":
      return 6
    case "None":
    default:
      return 0
  }
}
