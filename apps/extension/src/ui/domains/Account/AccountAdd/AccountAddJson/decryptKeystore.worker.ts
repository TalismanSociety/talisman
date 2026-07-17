import { decryptPjsKeystore } from "@talismn/crypto"

import type { DecryptKeystoreRequest, DecryptKeystoreResponse } from "./decryptKeystoreMessages"

self.onmessage = (event: MessageEvent<DecryptKeystoreRequest>) => {
  const { id, keystore, password } = event.data

  try {
    const payload = decryptPjsKeystore(keystore, password)
    self.postMessage({ id, ok: true, payload } satisfies DecryptKeystoreResponse, {
      transfer: [payload.buffer as ArrayBuffer],
    })
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    } satisfies DecryptKeystoreResponse)
  }
}
