import { isHexString } from "@talismn/util"
import { hexToBytes } from "viem"
import { ETH_ERROR_EIP1474_INVALID_PARAMS, EthProviderRpcError } from "./EthProviderRpcError"

// Single source of truth for the text a personal_sign payload stands for: the signer hashes hex
// payloads as bytes and anything else as utf-8, and every surface that reads the message must see
// the same text. An odd number of hex digits is ambiguous (libraries pad on different sides), so it
// decodes to nothing rather than to a guess.
export const decodePersonalSignMessage = (message: string): string | null => {
  if (!isHexString(message)) return message
  if (message.length % 2) return null
  return new TextDecoder().decode(hexToBytes(message))
}

export const assertPersonalSignMessageDecodable = (message: string) => {
  if (decodePersonalSignMessage(message) === null)
    throw new EthProviderRpcError("Invalid parameter", ETH_ERROR_EIP1474_INVALID_PARAMS)
}
