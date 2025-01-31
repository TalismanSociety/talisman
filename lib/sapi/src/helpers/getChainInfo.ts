import { getConstantValue } from "./getConstantValue"
import { Chain } from "./types"

type SystemVersion = {
  spec_name: string
  spec_version: number
  transaction_version: number
}

export const getChainInfo = (chain: Chain) => {
  const {
    spec_name: specName,
    spec_version: specVersion,
    transaction_version: transactionVersion,
  } = getConstantValue<SystemVersion>(chain, "System", "Version")

  const base58Prefix = getConstantValue<number>(chain, "System", "SS58Prefix")

  return {
    specName,
    specVersion,
    transactionVersion,
    base58Prefix,
  }
}
