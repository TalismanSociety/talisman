// inspired from https://github.com/wevm/viem/blob/main/src/utils/address/getAddress.ts

import { keccak_256 } from "@noble/hashes/sha3"

const TEXT_ENCODER = new TextEncoder()

export const isEthAddress = (address: string): address is `0x${string}` =>
  /^0x[a-fA-F0-9]{40}$/.test(address)

export const normalizeEthAddress = (address: `0x${string}`): `0x${string}` => {
  if (!isEthAddress(address)) throw new Error(`Invalid Ethereum address ${address}`)

  const rawAddress = address.toLowerCase().substring(2)
  const bytes = TEXT_ENCODER.encode(rawAddress)
  const hash = keccak_256(bytes)

  // apply checksum
  const csAddress = rawAddress.split("")
  for (let i = 0; i < 40; i += 2) {
    if (hash[i >> 1] >> 4 >= 8 && address[i]) {
      csAddress[i] = csAddress[i].toUpperCase()
    }
    if ((hash[i >> 1] & 0x0f) >= 8 && address[i + 1]) {
      csAddress[i + 1] = csAddress[i + 1].toUpperCase()
    }
  }

  return `0x${csAddress.join("")}`
}
