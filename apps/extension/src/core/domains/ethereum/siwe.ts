import { ParsedMessage } from "@spruceid/siwe-parser"
import { decodePersonalSignMessage } from "./personalSignMessage"

export const parseSiweMessage = (message: string | undefined): ParsedMessage | null => {
  if (!message) return null
  const text = decodePersonalSignMessage(message)
  if (text === null) return null
  try {
    return new ParsedMessage(text)
  } catch {
    return null
  }
}

/**
 * EIP-4361: a Sign-In With Ethereum message must declare a `domain` matching the requesting site.
 * Returns true only for a `personal_sign` SIWE message whose declared domain differs from the
 * site's hostname — the case where the user should be warned before signing.
 * Any non-SIWE (or unparseable) message returns false: there is no domain to mismatch.
 */
export const isSiweDomainMismatch = (
  method: string | undefined,
  message: string | undefined,
  url: string | undefined
): boolean => {
  if (method !== "personal_sign" || !url) return false
  const siwe = parseSiweMessage(message)
  if (!siwe) return false
  try {
    return siwe.domain !== new URL(url).hostname
  } catch {
    return false
  }
}
