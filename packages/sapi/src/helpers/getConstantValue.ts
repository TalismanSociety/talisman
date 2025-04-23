import log from "../log"
import { Chain } from "./types"

export const getConstantValue = <T>(chain: Chain, pallet: string, constant: string) => {
  try {
    const storageCodec = chain.builder.buildConstant(pallet, constant)

    const encodedValue = chain.metadata.pallets
      .find(({ name }) => name === pallet)
      ?.constants.find(({ name }) => name === constant)?.value

    if (!encodedValue) throw new Error(`Constant ${pallet}.${constant} not found`)

    return storageCodec.dec(encodedValue) as T
  } catch (err) {
    log.error("Failed to get constant value", {
      err,
      chainId: chain.connector.chainId,
      pallet,
      constant,
    })
    throw err
  }
}
