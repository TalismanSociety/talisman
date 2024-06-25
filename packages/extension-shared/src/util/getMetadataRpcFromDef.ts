import { TalismanMetadataDef } from "../domains/substrate/types"
import { decodeMetadataRpc } from "./decodeMetadataRpc"

/**
 *
 * @param metadataDef
 * @returns Decoded metadataRpc which can be used to build transaction payloads
 */
export const getMetadataRpcFromDef = (metadataDef?: TalismanMetadataDef) => {
  if (metadataDef?.metadataRpc) return decodeMetadataRpc(metadataDef.metadataRpc)
  return undefined
}
