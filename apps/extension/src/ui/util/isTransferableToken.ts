import { Token } from "@talismn/chaindata-provider"

export const isTransferableToken = (t: Token) => {
  // specific tokens that we don't support yet
  if (["crust-substrate-native-cru"].includes(t.id)) return false

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
