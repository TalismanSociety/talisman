import { classNames } from "@talismn/util"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "talisman-ui"
import { recoverMessageAddress } from "viem"
import { useAccount, useWalletClient } from "wagmi"

import { Section } from "../../shared/Section"

export const PersonalSignReversed = () => {
  const { isConnected, address } = useAccount()

  const { data: walletClient } = useWalletClient()

  const [signature, setSignature] = useState<`0x${string}`>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error>()

  const message = useMemo(() => `Sign this message to login with address ${address}`, [address])

  const handleSignClick = useCallback(async () => {
    setError(undefined)
    setIsLoading(true)
    try {
      if (walletClient && address)
        setSignature(
          await walletClient.request({
            method: "personal_sign",
            params: [address, message as `0x${string}`],
          })
        )
    } catch (err) {
      setError(err as Error)
    }
    setIsLoading(false)
  }, [address, message, walletClient])

  const [signedBy, setSignedBy] = useState<`0x${string}`>()

  useEffect(() => {
    setSignedBy(undefined)
    if (signature) recoverMessageAddress({ message, signature }).then(setSignedBy)
  }, [message, signature])

  if (!isConnected) return null

  return (
    <Section title="Personal Sign with params in wrong order + message unencoded">
      <div className="pt-4">
        <Button small type="button" onClick={handleSignClick} processing={isLoading}>
          Sign message
        </Button>
      </div>
      <div className="my-8">
        {signature && (
          <div>
            Signature : <span className="font-mono">{signature}</span>
          </div>
        )}
        {error && <div className="text-alert-error my-8 ">Error : {error?.message}</div>}
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
    </Section>
  )
}
