import { classNames } from "@talismn/util"
import { useCallback, useEffect, useState } from "react"
import { Button } from "talisman-ui"
import { recoverMessageAddress } from "viem"
import { useAccount, useSignMessage } from "wagmi"

import { Section } from "../../shared/Section"

export const PersonalSignBig = () => (
  <Section title="Personal Sign (BIG)">
    <PersonalSignBigInner />
  </Section>
)

const PersonalSignBigInner = () => {
  const { isConnected, address } = useAccount()
  const [message] = useState(() => "Thanos was right.\n".repeat(1_000_000))

  const { data: signature, isError, isLoading, isSuccess, signMessage, error } = useSignMessage()

  const handleSignClick = useCallback(() => {
    signMessage?.({ message })
  }, [message, signMessage])

  const [signedBy, setSignedBy] = useState<`0x${string}`>()

  useEffect(() => {
    setSignedBy(undefined)
    if (signature) recoverMessageAddress({ message, signature }).then(setSignedBy)
  }, [message, signature])

  if (!isConnected) return null

  return (
    <div>
      <Button small type="button" onClick={handleSignClick} processing={isLoading}>
        Sign BIG message (18M characters)
      </Button>
      <div className="my-8">
        {isSuccess && (
          <div>
            Signature : <span className="font-mono">{signature}</span>
          </div>
        )}
        {isError && <div className="text-alert-error my-8 ">Error : {error?.message}</div>}
        {signature && (
          <div>
            Signed by :{" "}
            <span
              className={classNames(
                "font-mono",
                signedBy === address ? "text-alert-success" : "text-alert-error"
              )}
            >
              {signedBy}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
