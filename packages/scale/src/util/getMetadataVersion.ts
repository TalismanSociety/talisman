import { Struct, u32, u8 } from "scale-ts"

/**
 * Extracts the `version` u8 from a SCALE-encoded metadata blob and returns it as a `number`.
 *
 * Only reads the first 40 bytes of the blob.
 */
export const getMetadataVersion = (metadataRpc: string | Uint8Array | ArrayBuffer) => {
  try {
    return Struct({
      magicNumber: u32,
      version: u8,
    }).dec(metadataRpc).version
  } catch {
    return 0
  }
}
