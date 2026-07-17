import { compactNumber } from "@polkadot-api/substrate-bindings"
import type { getPjsTxHelper } from "@polkadot-api/tx-utils"

type CustomExtensionMappers = NonNullable<Parameters<typeof getPjsTxHelper>[1]>

const EMPTY = new Uint8Array()

/**
 * Encoders for chain-specific signed extensions that `@polkadot-api/tx-utils` doesn't know about.
 */
export const CUSTOM_SIGNED_EXTENSIONS: CustomExtensionMappers = {
  // Avail app-id; wallet-built payloads default it to 0 (see getSignerPayloadJSON)
  CheckAppId: ({ pjsPayload }) => {
    const appId = Number((pjsPayload as { appId?: unknown }).appId ?? 0)
    return {
      value: compactNumber.enc(Number.isFinite(appId) ? appId : 0),
      additionalSigned: EMPTY,
    }
  },
}
