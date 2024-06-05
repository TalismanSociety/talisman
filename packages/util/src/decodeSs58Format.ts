import { base58Decode, checkAddressChecksum, decodeAddress } from "@polkadot/util-crypto"

export const decodeSs58Format = (address?: string) => {
  if (!address) return

  try {
    decodeAddress(address)

    const decoded = base58Decode(address)
    const [, , , ss58Format] = checkAddressChecksum(decoded)

    return ss58Format
  } catch {
    return // invalid address
  }
}
