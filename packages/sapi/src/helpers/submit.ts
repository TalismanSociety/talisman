import type { SignerPayloadJSON } from "../pjsInterop"
import type { ScaleApiSubmitMode } from "../types"
import type { Chain } from "./types"

export const submit = async (
  chain: Chain,
  payload: SignerPayloadJSON,
  signature?: `0x${string}`,
  txInfo?: unknown,
  mode?: ScaleApiSubmitMode
): Promise<{ hash: `0x${string}`; innerHash?: `0x${string}` }> => {
  switch (mode) {
    case "bittensor-mev-shield":
      if (signature)
        throw new Error("Signature should not be provided when using bittensor-mev-shield mode")
      return chain.connector.submitWithBittensorMevShield(payload, txInfo)

    default:
      return chain.connector.submit(payload, signature, txInfo)
  }
}
