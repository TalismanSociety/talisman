import type { SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"

const isJsonPayload = (value: SignerPayloadJSON | SignerPayloadRaw): value is SignerPayloadJSON => {
  return (value as SignerPayloadJSON).genesisHash !== undefined
}

export default isJsonPayload
