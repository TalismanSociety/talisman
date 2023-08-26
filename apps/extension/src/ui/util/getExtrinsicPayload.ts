import { TypeRegistry } from "@polkadot/types"
import { SignerPayloadJSON } from "@polkadot/types/types"

// reuse this as it's not chain specific
const registry = new TypeRegistry()

export const getExtrinsicPayload = (payload: SignerPayloadJSON) => {
  return registry.createType("ExtrinsicPayload", payload)
}
