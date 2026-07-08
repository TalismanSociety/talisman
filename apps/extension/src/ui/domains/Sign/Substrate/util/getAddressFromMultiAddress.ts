import type { MultiAddress } from "@polkadot-api/descriptors"
import { encodeAddressSs58, normalizeAddress } from "@talismn/crypto"
import { Binary } from "@polkadot-api/substrate-bindings"

export const getAddressFromMultiAddress = (multiAddress: MultiAddress | string) => {
  if (typeof multiAddress === "string") return multiAddress

  switch (multiAddress.type) {
    case "Id":
      return normalizeAddress(multiAddress.value)
    case "Raw":
      return normalizeAddress(Binary.toText(multiAddress.value))
    case "Address32":
      return encodeAddressSs58(Binary.fromHex(multiAddress.value))
    case "Address20":
      return normalizeAddress(multiAddress.value)
    default:
      throw new Error("Invalid MultiAddress type")
  }
}
