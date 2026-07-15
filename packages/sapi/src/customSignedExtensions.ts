import { compactNumber } from "@polkadot-api/substrate-bindings"
import type { getPjsTxHelper } from "@polkadot-api/tx-utils"

type CustomExtensionMappers = NonNullable<Parameters<typeof getPjsTxHelper>[1]>

const EMPTY = new Uint8Array()

/**
 * Encoders for chain-specific signed extensions that tx-utils doesn't know about.
 * Pass to `getPjsTxHelper`. NOTE: tx-utils invokes every mapper for every payload
 * (results for extensions absent from the chain's metadata are discarded), so
 * handlers must tolerate payloads that lack their fields.
 */
export const CUSTOM_SIGNED_EXTENSIONS: CustomExtensionMappers = {
  // Avail app-id; wallet-built payloads default it to 0 (see getSignerPayloadJSON)
  CheckAppId: ({ pjsPayload }) => ({
    value: compactNumber.enc(Number((pjsPayload as { appId?: unknown }).appId ?? 0)),
    additionalSigned: EMPTY,
  }),
}
