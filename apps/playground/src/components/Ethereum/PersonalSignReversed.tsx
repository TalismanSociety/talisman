import { classNames } from "@talismn/util"
import { ethers } from "ethers"
import { useCallback, useMemo, useState } from "react"
import { Button } from "talisman-ui"
import { useAccount } from "wagmi"

import { Section } from "../Section"

export const PersonalSignReversed = () => {
  const { isConnected, address, connector } = useAccount()

  const [signature, setSignature] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error>()

  // using astar's portal pattern as test case
  const message = useMemo(() => `Sign this message to login with address ${address}`, [address])

  const handleSignClick = useCallback(async () => {
    setError(undefined)
    setIsLoading(true)
    try {
      const provider = await connector?.getProvider()
      setSignature(
        await provider.request({
          method: "personal_sign",
          params: [address, message],
        })
      )
    } catch (err) {
      setError(err as Error)
    }
    setIsLoading(false)
  }, [address, connector, message])

  const signedBy = useMemo(
    () => (signature ? ethers.utils.verifyMessage(message, signature) : null),
    [signature, message]
  )

  if (!isConnected) return null

  return (
    <Section title="Personal Sign with params in wrong order + message unencoded">
      <div>
        <Button type="button" onClick={handleSignClick} processing={isLoading}>
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
