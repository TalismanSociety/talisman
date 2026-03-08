import { StorageProvider } from "../../libs/Store"

export type GandalfStoreData = {
  /** UUID returned by the Gandalf API upon registration */
  installId: string | null
  /**
   * Hex-encoded Ed25519 private key used to sign token requests.
   *
   * This is NOT a wallet key — it is an anonymous, per-install credential
   * used solely to authorize and rate limit API requests to Talisman services.
   * It cannot access user funds and is revocable server-side.
   * It must remain unencrypted in storage to be usable for API requests in the service worker.
   */
  privateKeyHex: string | null
}

export const gandalfStore = new StorageProvider<GandalfStoreData>("gandalf", {
  installId: null,
  privateKeyHex: null,
})
