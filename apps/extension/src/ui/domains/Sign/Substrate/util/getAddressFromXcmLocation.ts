import { log } from "@common/log"
import type { Address } from "@core/types/base"
import type { XcmVersionedLocation } from "@polkadot-api/descriptors"
import { encodeAddressEthereum, encodeAddressSs58 } from "@talismn/crypto"
import { Binary, type SizedHex } from "@polkadot-api/substrate-bindings"

export const getAddressFromXcmLocation = (multiLocation: XcmVersionedLocation): Address => {
  try {
    const interior = multiLocation.value.interior

    if (interior.type === "Here") throw new Error("Unknown address")

    if (interior.type === "X1") {
      if (interior.value.type === "AccountKey20") return interior.value.value.key
      if (interior.value.type === "AccountId32")
        return getAddressFromAccountId32(interior.value.value.id)
      throw new Error("Unknown address")
    }

    const anyAccountKey20 = interior.value.find((i) => i.type === "AccountKey20")
    if (anyAccountKey20?.type === "AccountKey20") return anyAccountKey20.value.key

    const anyAccountId32 = interior.value.find((i) => i.type === "AccountId32")
    if (anyAccountId32?.type === "AccountId32")
      return getAddressFromAccountId32(anyAccountId32.value.id)

    // throw an error so the sign popup fallbacks to default view
    throw new Error("Unknown address")
  } catch (error) {
    log.debug("getAddressFromXcmLocation", { multiLocation, error })
    throw error
  }
}

const ETH_PREFIX = new Uint8Array([69, 84, 72, 0])

const getAddressFromAccountId32 = (accountId32: SizedHex<32>): Address => {
  // some chains support evm accounts (AccountId20) as AccountId32, prefixed with ETH (in ASCII) and suffixed with empty bytes to fill the remaining of the array
  // in this case we should identify the corresponding evm address
  // test case: hydration portal, xcm mythos from mythos to hydration

  // polkadot-api v2 decodes the fixed-size AccountId32 as a hex string
  const bytes = Binary.fromHex(accountId32)
  if (isPrefixMatch(bytes, ETH_PREFIX)) return encodeAddressEthereum(bytes.slice(4, 24))

  return encodeAddressSs58(bytes)
}

const isPrefixMatch = (bytes: Uint8Array, prefix: Uint8Array) => {
  // Check if the Uint8Array length is at least as long as the sequence
  if (bytes.length < prefix.length) return false

  // Compare each element of the sequence with the array
  for (let i = 0; i < prefix.length; i++) if (bytes[i] !== prefix[i]) return false

  return true
}
