import { useCallback, useState } from "react"
import { Button } from "talisman-ui"
import { useAccount } from "wagmi"

import { Section } from "../../shared/Section"

// TODO : use a known message so we could verify signature
const ENCODED_MESSAGE = "0xed53794e4b58f06f378f94c4c880e5c631d8d959e54a452508f7012dd4cc6769"

export const PersonalSignNftListing = () => (
  <Section title="Personal Sign for NFT listing">
    <PersonalSignNftListingInner />
  </Section>
)

const PersonalSignNftListingInner = () => {
  const { isConnected, address, connector } = useAccount()

  const [signature, setSignature] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error>()

  const handleSignClick = useCallback(async () => {
    setError(undefined)
    setIsLoading(true)
    try {
      const provider = await connector?.getProvider()
      setSignature(
        await provider.request({
          method: "personal_sign",
          params: [ENCODED_MESSAGE, address],
        })
      )
    } catch (err) {
      setError(err as Error)
    }
    setIsLoading(false)
  }, [address, connector])

  // const signedBy = useMemo(
  //   () => (signature ? ethers.utils.verifyMessage(MESSAGE, signature) : null),
  //   [signature]
  // )

  if (!isConnected) return null

  return (
    <>
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
            Not sure how to verify signature programmatically because we don't know the unencoded
            message, compare with metamask using same account
            {/* Signed by :{" "}
            <span
              className={classNames(
                "font-mono",
                signedBy === address ? "text-alert-success" : "text-alert-error"
              )}
            >
              {signedBy}
            </span> */}
          </div>
        )}
      </div>
    </>
  )
}
