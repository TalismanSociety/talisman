import { Struct, u32, u8 } from "scale-ts"

export const getMetadataVersion = (metadataRpc: string | Uint8Array | ArrayBuffer) =>
  Struct({
    magicNumber: u32,
    version: u8,
  }).dec(metadataRpc).version
