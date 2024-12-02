import { XcmVersionedLocation } from "@polkadot-api/descriptors"
import { u8aToHex } from "@polkadot/util"
import { encodeAnyAddress } from "@talismn/util"
import { Address } from "extension-core"
import { log } from "extension-shared"
import { FixedSizeBinary } from "polkadot-api"

export const getAddressFromXcmLocation = (multiLocation: XcmVersionedLocation): Address => {
  try {
    const interior = multiLocation.value.interior

    if (interior.type === "Here") throw new Error("Unknown address")

    if (interior.type === "X1") {
      if (interior.value.type === "AccountKey20") return interior.value.value.key.asHex()
      if (interior.value.type === "AccountId32")
        return getAddressFromAccountId32(interior.value.value.id)
      throw new Error("Unknown address")
    }

    const anyAccountKey20 = interior.value.find((i) => i.type === "AccountKey20")
    if (anyAccountKey20) return anyAccountKey20.value.key.asHex()

    const anyAccountId32 = interior.value.find((i) => i.type === "AccountId32")
    if (anyAccountId32) return getAddressFromAccountId32(anyAccountId32.value.id)

    // throw an error so the sign popup fallbacks to default view
    throw new Error("Unknown address")
  } catch (error) {
    log.debug("getAddressFromXcmLocation", { multiLocation, error })
    throw error
  }
}

const ETH_PREFIX = new Uint8Array([69, 84, 72, 0])

const getAddressFromAccountId32 = (accountId32: FixedSizeBinary<32>): Address => {
  // some chains support evm accounts (AccountId20) as AccountId32, prefixed with ETH (in ASCII) and suffixed with empty bytes to fill the remaining of the array
  // in this case we should identify the corresponding evm address
  // test case: hydration portal, xcm mythos from mythos to hydration

  if (isPrefixMatch(accountId32.asBytes(), ETH_PREFIX))
    return u8aToHex(accountId32.asBytes().slice(4, 24))

  return encodeAnyAddress(accountId32.asBytes())
}

const isPrefixMatch = (bytes: Uint8Array, prefix: Uint8Array) => {
  // Check if the Uint8Array length is at least as long as the sequence
  if (bytes.length < prefix.length) return false

  // Compare each element of the sequence with the array
  for (let i = 0; i < prefix.length; i++) if (bytes[i] !== prefix[i]) return false

  return true
}
