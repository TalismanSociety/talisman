import { SignerResult } from "@polkadot/api/types"
import { signatureVerify } from "@polkadot/util-crypto"
import { useCallback, useMemo, useState } from "react"
import { Button } from "talisman-ui"

import { Section } from "../../shared/Section"
import { useWallet } from "../shared/useWallet"

const TEST_MESSAGE = `This message is short enough to display on ledger screen.`

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

  const handleSignMessageClick = useCallback(
    (payloadType: "payload" | "bytes") => async () => {
      setError(undefined)
      setResult(undefined)
      if (!extension?.signer?.signRaw || !account) return

      try {
        setIsProcessing(true)
        setResult(
          await extension.signer.signRaw({
            address: account.address,
            data: TEST_MESSAGE,
            type: payloadType,
          })
        )
      } catch (err) {
        setError(err as Error)
      }
      setIsProcessing(false)
    },
    [account, extension?.signer]
  )

  const verify = useMemo(() => {
    return result
      ? signatureVerify(TEST_MESSAGE, result.signature as string, account?.address as string)
      : null
  }, [account?.address, result])

  return (
    <div className="pt-4">
      <div className="flex items-center gap-8">
        <Button
          small
          processing={isProcessing}
          disabled={!account || !extension}
          onClick={handleSignMessageClick("bytes")}
        >
          Sign Message as Bytes
        </Button>
        <Button
          small
          processing={isProcessing}
          disabled={!account || !extension}
          onClick={handleSignMessageClick("payload")}
        >
          Sign Message as Payload
        </Button>
      </div>
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
