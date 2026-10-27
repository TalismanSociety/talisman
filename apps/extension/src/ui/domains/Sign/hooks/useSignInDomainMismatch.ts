import { getForeignSignInDomain, getHost } from "@core/domains/signing/helpers"
import { useMemo, useState } from "react"

export const useSignInDomainMismatch = (
  messageText: string | null | undefined,
  url: string | undefined
) => {
  const signInDomain = useMemo(
    () => (messageText && url ? getForeignSignInDomain(messageText, url) : undefined),
    [messageText, url]
  )
  const siteHost = useMemo(() => (url ? getHost(url) : null), [url])
  const [isAcknowledged, setIsAcknowledged] = useState(false)
  const isMismatch = signInDomain !== undefined

  return {
    signInDomain,
    siteHost,
    isMismatch,
    isAcknowledged,
    setIsAcknowledged,
    isBlocking: isMismatch && !isAcknowledged,
  }
}

export type SignInDomainMismatch = ReturnType<typeof useSignInDomainMismatch>
