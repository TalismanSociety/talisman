import { compactNumber } from "@polkadot-api/substrate-bindings"
import { empty, signedExtension } from "./vendor/tx-utils/signed-extensions/utils"
import type { CustomSignedExtensions } from "./vendor/tx-utils/types"

/**
 * Encoders for chain-specific signed extensions that tx-utils doesn't know about.
 * Pass to `getPjsTxHelper` / `getTxHelper` — handlers are only invoked for chains whose
 * metadata declares the corresponding identifier.
 */
export const CUSTOM_SIGNED_EXTENSIONS: CustomSignedExtensions = {
  // Avail app-id; wallet-built payloads default it to 0 (see getSignerPayloadJSON)
  CheckAppId: (payload) => signedExtension(compactNumber.enc(Number(payload.appId ?? 0)), empty),
}
