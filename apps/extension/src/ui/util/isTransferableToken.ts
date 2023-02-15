import { Token } from "@talismn/chaindata-provider"

export const isTransferableToken = (t: Token) => {
  switch (t.type) {
    case "substrate-native":
    case "substrate-orml":
    case "evm-erc20":
    case "evm-native":
      return true
    default:
      return false
  }
}
