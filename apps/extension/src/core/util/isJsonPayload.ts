import type { SignerPayloadJSON, SignerPayloadRaw } from "../types/pjsInterop"

export const isJsonPayload = (
  value: SignerPayloadJSON | SignerPayloadRaw
): value is SignerPayloadJSON => (value as SignerPayloadJSON).genesisHash !== undefined

export const isRawPayload = (
  value: SignerPayloadJSON | SignerPayloadRaw
): value is SignerPayloadRaw => !isJsonPayload(value)
