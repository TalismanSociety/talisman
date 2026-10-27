import { parseMessage, type SiwsMessage } from "@talismn/siws"
import { u8aToString, u8aUnwrapBytes } from "@talismn/util"

// Reads the domain off the first line only, as viem, @solana/wallet-standard-util and
// @talismn/siws do, and requires nothing after the phrase so variants they accept still match.
const SIGN_IN_FIRST_LINE = /^\s*(\S[^\n]*?) wants you to sign in with your /
const SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:\/\//i

const normaliseDomain = (domain: string) => domain.replace(SCHEME_PREFIX, "").toLowerCase()

export const getSignInDomains = (text: string): string[] => {
  const headerDomain = SIGN_IN_FIRST_LINE.exec(text)?.[1]
  // a JSON message carries an untyped domain
  const siwsDomain = parseSubstrateSignInMessage(text)?.domain as unknown
  const domains = [headerDomain, siwsDomain]
    .filter((domain) => domain !== undefined)
    .map((domain) => normaliseDomain(String(domain)))
  return [...new Set(domains)]
}

export const getHost = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

export const getForeignSignInDomain = (text: string, url: string): string | undefined => {
  const host = getHost(url)
  return getSignInDomains(text).find((domain) => domain !== host)
}

export const isSignInDomainMismatch = (text: string, url: string): boolean =>
  getForeignSignInDomain(text, url) !== undefined

// the text the keyring signs: hex decoded and <Bytes> unwrapped
export const decodeSubstrateRawMessage = (data: string): string => u8aToString(u8aUnwrapBytes(data))

export const parseSubstrateSignInMessage = (text: string): SiwsMessage | null => {
  try {
    return parseMessage(text)
  } catch {
    return null
  }
}
