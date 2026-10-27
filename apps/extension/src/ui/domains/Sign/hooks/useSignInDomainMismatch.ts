import { isSignInDomainMismatch } from "@core/domains/signing/helpers"
import { useMemo, useState } from "react"

export const useSignInDomainMismatch = (
  signInDomain: string | undefined,
  url: string | undefined
) => {
  const isMismatch = useMemo(
    () =>
      signInDomain !== undefined && url !== undefined && isSignInDomainMismatch(signInDomain, url),
    [signInDomain, url]
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
