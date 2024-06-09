import { SignerResult } from "@polkadot/api/types"
import { signatureVerify } from "@polkadot/util-crypto"
import { useCallback, useMemo, useState } from "react"
import { Button } from "talisman-ui"

import { Section } from "../../shared/Section"
import { useWallet } from "../shared/useWallet"

/**
const TEST_MESSAGE = `First line of the message

3rd line
















20th line and this has a lot of text a lot of text a lot of text a lot of text a lot of text a lot of text.
`
 */

const TEST_MESSAGE = `This is a short message that should display on ledger screen.`

export const SignMessage = () => (
  <Section title="Sign message">
    <SignMessageInner />
  </Section>
)

const SignMessageInner = () => {
  const { account, extension } = useWallet()
  const [result, setResult] = useState<SignerResult>()
  const [error, setError] = useState<Error>()
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const handleSignMessageClick = useCallback(async () => {
    setError(undefined)
    setResult(undefined)
    if (!extension?.signer?.signRaw || !account) return

    try {
      setIsProcessing(true)
      setResult(
        await extension.signer.signRaw({
          address: account.address,
          data: TEST_MESSAGE,
          type: "bytes",
        })
      )
    } catch (err) {
      setError(err as Error)
    }
    setIsProcessing(false)
  }, [account, extension?.signer])

  const verify = useMemo(() => {
    return result
      ? signatureVerify(TEST_MESSAGE, result.signature as string, account?.address as string)
      : null
  }, [account?.address, result])

  return (
    <div className="pt-4">
      <Button
        small
        processing={isProcessing}
        disabled={!account || !extension}
        onClick={handleSignMessageClick}
      >
        Sign Message
      </Button>
      {result && <pre className="my-8 ">{JSON.stringify(result, undefined, 2)}</pre>}
      {verify && (
        <pre className="my-8 ">
          {JSON.stringify({ ...verify, publicKey: "[redacted]" }, undefined, 2)}
        </pre>
      )}
      {result ? (
        verify?.isValid ? (
          <div className="text-alert-success my-8 ">Signature is valid</div>
        ) : (
          <div className="text-alert-error my-8 ">Signature is invalid</div>
        )
      ) : null}
      {error && <div className="text-alert-error my-8 ">Error : {error?.message}</div>}
    </div>
  )
}
