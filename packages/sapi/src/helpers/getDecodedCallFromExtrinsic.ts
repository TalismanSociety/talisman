import { getExtrinsicDecoder } from "@polkadot-api/tx-utils"
import { fromHex } from "@polkadot-api/utils"

import type { DecodedCall } from "../types"
import type { Chain } from "./types"

const extrinsicDecoders = new WeakMap<Chain, ReturnType<typeof getExtrinsicDecoder>>()

const getChainExtrinsicDecoder = (chain: Chain) => {
  const cached = extrinsicDecoders.get(chain)
  if (cached) return cached

  const decoder = getExtrinsicDecoder(fromHex(chain.hexMetadata))
  extrinsicDecoders.set(chain, decoder)
  return decoder
}

/**
 * @returns the call of a bare, signed (v4) or general (v5) extrinsic, or null if it cannot be decoded
 */
export const getDecodedCallFromExtrinsic = <Res extends DecodedCall>(
  chain: Chain,
  extrinsicHex: `0x${string}`
): Res | null => {
  try {
    const { call } = getChainExtrinsicDecoder(chain)(extrinsicHex)

    return {
      pallet: call.type,
      method: call.value.type,
      args: call.value.value,
    } as Res
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: troubleshoting
    console.error("[SAPI] Failed to decode extrinsic:", err)
    return null
  }
}
