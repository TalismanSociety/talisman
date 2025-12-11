import { SignerPayloadJSON } from "@polkadot/types/types"

import { Chain } from "./types"

export type ScaleApiSubmitMode = "default" | "bittensor-mev-shield"

export const submit = async (
  chain: Chain,
  payload: SignerPayloadJSON,
  signature?: `0x${string}`,
  txInfo?: unknown,
  mode?: ScaleApiSubmitMode,
) => {
  switch (mode) {
    case "bittensor-mev-shield":
      if (signature)
        throw new Error("Signature should not be provided when using bittensor-mev-shield mode")
      return chain.connector.submitWithBittensorMevShield(payload, txInfo)

    default:
      return chain.connector.submit(payload, signature, txInfo)
  }
}
