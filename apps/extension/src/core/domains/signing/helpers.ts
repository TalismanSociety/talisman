import { parseMessage, type SiwsMessage } from "@talismn/siws"
import { u8aToString, u8aUnwrapBytes } from "@talismn/util"

// Matches the CAIP-122 header line on its own rather than parsing the whole message: verifiers
// such as viem accept variants that strict parsers reject, and a variant must not escape the check.
const SIGN_IN_HEADER =
  /^\s*(?:[a-z][a-z0-9+.-]*:\/\/)?(.+?) wants you to sign in with your .+ account:/gim

export const getSignInDomains = (text: string): string[] =>
  Array.from(text.matchAll(SIGN_IN_HEADER), ([, domain]) => domain.toLowerCase())

const getHost = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

export const isSignInDomainMismatch = (text: string, url: string): boolean => {
  const domains = getSignInDomains(text)
  if (!domains.length) return false
  const host = getHost(url)
  return domains.some((domain) => domain !== host)
}

// the text the keyring signs: hex decoded and <Bytes> unwrapped
export const decodeSubstrateRawMessage = (data: string): string => u8aToString(u8aUnwrapBytes(data))

export const parseSubstrateSignInMessage = (text: string): SiwsMessage | null => {
  try {
    return parseMessage(text)
  } catch {
    return null
  }
}
