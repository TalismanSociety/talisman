import { Enum } from "@polkadot-api/substrate-bindings"
import type { ScaleApi } from "@talismn/sapi"

/**
 * Builds a proxy extrinsic payload, handling chains that use `MultiAddress`
 * for the delegate parameter as well as chains that use a plain `AccountId32`.
 *
 * Follows the same brute-force encoding pattern used by our balance transfer
 * modules (see `substrate-native/getTransferCallData.ts`).
 */
export const buildProxyPayload = async (
  sapi: ScaleApi,
  method: "add_proxy" | "remove_proxy",
  delegate: string,
  proxyType: string,
  delay: number,
  address: string
) => {
  // Some chains (e.g. Polkadot, Kusama) wrap the delegate in MultiAddress,
  // while others (e.g. Hydration, Mythos) use a plain AccountId32.
  // The codec.enc() call inside getExtrinsicPayload is synchronous and throws
  // before any RPC work, so a failed variant is cheap.
  const argVariants = [
    {
      delegate: Enum("Id", delegate),
      proxy_type: Enum(proxyType),
      delay,
    },
    {
      delegate,
      proxy_type: Enum(proxyType),
      delay,
    },
  ]

  let lastError: unknown
  for (const args of argVariants) {
    try {
      return await sapi.getExtrinsicPayload("Proxy", method, args, { address })
    } catch (err) {
      lastError = err
    }
  }

  throw lastError
}
