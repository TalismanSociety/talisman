import { hexToString } from "@polkadot/util"
import { ParsedMessage } from "@spruceid/siwe-parser"

/**
 * EIP-4361: a Sign-In With Ethereum message must declare a `domain` matching the requesting site.
 * Returns true only for a `personal_sign` SIWE message whose declared domain differs from the
 * site's hostname — the case where the user should be warned before signing.
 * Any non-SIWE (or unparseable) message returns false: there is no domain to mismatch.
 */
export const isSiweDomainMismatch = (
  method: string | undefined,
  messageHex: string | undefined,
  url: string | undefined
): boolean => {
  if (method !== "personal_sign" || !messageHex || !url) return false
  try {
    const siwe = new ParsedMessage(hexToString(messageHex))
    return siwe.domain !== new URL(url).hostname
  } catch {
    // not a SIWE message (or unparseable) => nothing to flag
    return false
  }
}
