import { MultiAddress } from "@polkadot-api/descriptors"
import { encodeAddressSs58, normalizeAddress } from "@talismn/crypto"

export const getAddressFromMultiAddress = (multiAddress: MultiAddress | string) => {
  if (typeof multiAddress === "string") return multiAddress

  switch (multiAddress.type) {
    case "Id":
      return normalizeAddress(multiAddress.value)
    case "Raw":
      return normalizeAddress(multiAddress.value.asText())
    case "Address32":
      return encodeAddressSs58(multiAddress.value.asBytes())
    case "Address20":
      return normalizeAddress(multiAddress.value.asHex())
    case "Index":
    default:
      throw new Error("Invalid MultiAddress type")
  }
}
