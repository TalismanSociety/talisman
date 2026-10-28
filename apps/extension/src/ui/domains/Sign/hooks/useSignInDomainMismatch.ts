import { isSignInDomainMismatch } from "@core/domains/signing/helpers"
import { useMemo, useState } from "react"

export const useSignInDomainMismatch = (
  messageText: string | null | undefined,
  url: string | undefined
) => {
  const isMismatch = useMemo(
    () => !!messageText && !!url && isSignInDomainMismatch(messageText, url),
    [messageText, url]
  )
  const [isAcknowledged, setIsAcknowledged] = useState(false)

  return {
    isMismatch,
    isAcknowledged,
    setIsAcknowledged,
    isBlocking: isMismatch && !isAcknowledged,
  }
}

export type SignInDomainMismatch = ReturnType<typeof useSignInDomainMismatch>
