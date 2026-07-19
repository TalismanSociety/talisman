import type { PjsKeystore } from "@talismn/crypto"

/** protocol between decryptKeystoreOffThread and its worker */
export type DecryptKeystoreRequest = {
  id: number
  keystore: PjsKeystore
  password: string
}

export type DecryptKeystoreResponse =
  | { id: number; ok: true; payload: Uint8Array }
  | { id: number; ok: false; error: string }
