import { MultiAddress } from "@polkadot-api/descriptors"
import { encodeAnyAddress } from "@talismn/util"

export const getAddressFromMultiAddress = (multiAddress: MultiAddress | string) => {
  if (typeof multiAddress === "string") return multiAddress

  switch (multiAddress.type) {
    case "Id":
      return encodeAnyAddress(multiAddress.value)
    case "Raw":
      return encodeAnyAddress(multiAddress.value.asText())
    case "Address32":
      return encodeAnyAddress(multiAddress.value.asBytes())
    case "Address20":
      return encodeAnyAddress(multiAddress.value.asHex())
    case "Index":
    default:
      throw new Error("Invalid MultiAddress type")
  }
}
