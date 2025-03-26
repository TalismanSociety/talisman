import { keccak_256 } from "@noble/hashes/sha3"
import { bytesToHex } from "@noble/hashes/utils"

/**
 * Encodes a public key using H160 encoding with Ethereum checksum.
 */
export const encodeAddressEthereum = (publicKey: Uint8Array): `0x${string}` => {
  // Ensure the public key is in uncompressed format (starts with 0x04)
  if (publicKey[0] !== 0x04) throw new Error("Invalid public key format")

  // Remove the prefix (0x04)
  const publicKeyWithoutPrefix = publicKey.slice(1)

  // Apply Keccak-256 hashing to the public key
  const hash = keccak_256(publicKeyWithoutPrefix)

  // Take the last 20 bytes of the hash to get the Ethereum address
  const address = hash.slice(-20)

  // Apply checksum
  return checksumEthereumAddress(`0x${bytesToHex(address)}`)
}

export const checksumEthereumAddress = (address: string): `0x${string}` => {
  const addr = address.toLowerCase().replace(/^0x/, "")
  const hash = keccak_256(new TextEncoder().encode(addr))
  const hashHex = bytesToHex(hash)

  const checksum = addr
    .split("")
    .map((char, i) => (parseInt(hashHex[i], 16) >= 8 ? char.toUpperCase() : char))
    .join("")

  return `0x${checksum}`
}

export function isEthereumAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Note: public key cannot be retrieved from an address, because address is hashed from only the last 20 bytes of the pk
