import { Token } from "@talismn/chaindata-provider"

export const isTransferableToken = (t: Token) => {
  switch (t.type) {
    case "substrate-native":
    case "substrate-orml":
    case "substrate-assets":
    case "substrate-tokens":
    case "substrate-equilibrium":
    case "evm-erc20":
    case "evm-native":
      return true
    default:
      return false
  }
}
