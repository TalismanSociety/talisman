import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js"

import { blake2b256 } from "../hashing"
import { decodeSs58Address, encodeAddressSs58, isEthereumAddress } from "./encoding"

// Frontier pallet_evm HashedAddressMapping<BlakeTwo256>, the mapper of AccountId32 Frontier chains
// (Bittensor, Astar): blake2b-256("evm:" ++ h160), no length prefix. AccountId20 Frontier chains
// (Moonbeam) use IdentityAddressMapping and need no conversion. Polkadot Asset Hub uses
// pallet_revive AccountId32Mapper (h160 ++ 0xEE * 12), which is a different scheme.
const EVM_PREFIX = /* @__PURE__ */ new TextEncoder().encode("evm:")

export const frontierH160ToAccountId32 = (h160: string): Uint8Array => {
  if (!isEthereumAddress(h160)) throw new Error("Invalid H160 address")

  const data = new Uint8Array(EVM_PREFIX.length + 20)
  data.set(EVM_PREFIX, 0)
  data.set(hexToBytes(h160.slice(2).toLowerCase()), EVM_PREFIX.length)

  return blake2b256(data)
}

export const frontierH160ToSs58Mirror = (h160: string, ss58Prefix = 42): string =>
  encodeAddressSs58(frontierH160ToAccountId32(h160), ss58Prefix)

export const frontierSs58ToPublicKeyHex = (address: string): `0x${string}` => {
  const [publicKey] = decodeSs58Address(address)
  if (publicKey.length !== 32) throw new Error("Expected a 32-byte public key")
  return `0x${bytesToHex(publicKey)}`
}
