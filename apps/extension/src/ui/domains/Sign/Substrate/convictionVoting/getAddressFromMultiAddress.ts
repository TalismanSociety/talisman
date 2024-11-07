import { encodeAnyAddress } from "@talismn/util"
import { MultiAddress } from "papi-descriptors"

export const getAddressFromMultiAddress = (multiAddress: MultiAddress) => {
  switch (multiAddress.type) {
    case "Id":
      return encodeAnyAddress(multiAddress.value)
    case "Raw":
      return encodeAnyAddress(multiAddress.value.asText())
    case "Address32":
    case "Address20":
      return encodeAnyAddress(multiAddress.value.asBytes())
    case "Index":
    default:
      throw new Error("Invalid MultiAddress type")
  }
}
