import { parseMessage, type SiwsMessage } from "@talismn/siws"
import { u8aToString, u8aUnwrapBytes } from "@talismn/util"

export const isSignInDomainMismatch = (domain: string, url: string): boolean => {
  try {
    return domain !== new URL(url).host
  } catch {
    return true
  }
}

// parses the text the keyring signs (hex decoded, <Bytes> unwrapped), not the raw payload,
// so a hex-encoded sign-in message is recognised as one
export const parseSubstrateSignInMessage = (data: string): SiwsMessage | null => {
  try {
    return parseMessage(u8aToString(u8aUnwrapBytes(data)))
  } catch {
    return null
  }
}
