import { Bytes, enhanceEncoder, u16 } from "@polkadot-api/substrate-bindings"
import { fromHex } from "@polkadot-api/utils"
import { getSs58AddressInfo } from "polkadot-api"

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////                 Utilities from PAPI                 /////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const toPjsHex = (value: number | bigint, minByteLen?: number) => {
  let inner = value.toString(16)
  inner = (inner.length % 2 ? "0" : "") + inner
  const nPaddedBytes = Math.max(0, (minByteLen || 0) - inner.length / 2)
  return `0x${"00".repeat(nPaddedBytes)}${inner}` as `0x${string}`
}

export const mortal = enhanceEncoder(Bytes(2).enc, (value: { period: number; phase: number }) => {
  const factor = Math.max(value.period >> 12, 1)
  const left = Math.min(Math.max(trailingZeroes(value.period) - 1, 1), 15)
  const right = (value.phase / factor) << 4
  return u16.enc(left | right)
})

function trailingZeroes(n: number) {
  let i = 0
  while (!(n & 1)) {
    i++
    n >>= 1
  }
  return i
}

export const isEthereumAddress = (address: string) => /^0x[0-9a-fA-F]{40}$/.test(address)

/** decodes an ss58 or ethereum address into its raw account bytes */
export const getAddressBytes = (address: string): Uint8Array => {
  if (isEthereumAddress(address)) return fromHex(address)
  const info = getSs58AddressInfo(address)
  if (!info.isValid) throw new Error(`Invalid address: ${address}`)
  return info.publicKey
}
