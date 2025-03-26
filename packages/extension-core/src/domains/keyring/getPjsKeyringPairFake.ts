import Keyring, { decodeAddress } from "@polkadot/keyring"
import { decodeSs58Address, detectAddressEncoding, isEthereumAddress } from "@talismn/crypto"

import { Address } from "../../types/base"

// TODO This is non-sense, delete after migrating to PAPI
const getPublicKeyFromAddress = (address: string) => {
  const encoding = detectAddressEncoding(address)

  switch (encoding) {
    case "ss58": {
      const [publicKey] = decodeSs58Address(address)
      return publicKey
    }
    case "ethereum": {
      // This is a hack: there is no way to obtain a public key from an ethereum address
      return decodeAddress(address)
    }
    default: {
      throw new Error("Unsupported address encoding")
    }
  }
}

/**
 * Workaround used to estimate fees with some PJS api
 * The provided public key and type might be incorrect
 * @param address
 * @returns
 */
export const getPjsKeyringPairFake = (address: Address) => {
  // we only need to specify this for ethereum addresses
  const type = isEthereumAddress(address) ? "ethereum" : undefined

  // use a PJS in-memory keyring to create the pair
  const keyring = new Keyring({})

  return keyring.addFromPair(
    {
      publicKey: getPublicKeyFromAddress(address),
      secretKey: new Uint8Array(),
    },
    { name: "Unknown" },
    type,
  )
}
