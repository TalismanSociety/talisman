import { AccountJsonHardwareSubstrate } from "@core/domains/accounts/types"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { useCallback, useMemo, useState } from "react"

import { useSendTokens } from "./context"
import { SendTokensInputs } from "./types"
import LedgerSubstrate from "@ui/domains/Sign/LedgerSubstrate"
import { HexString } from "@polkadot/util/types"

const SendLedgerSubstrate = () => {
  const { formData, expectedResult, sendWithSignature, cancel } = useSendTokens()
  const { from } = formData as SendTokensInputs
  const [error, setError] = useState<Error>()

  const account = useAccountByAddress(from) as AccountJsonHardwareSubstrate

  const payload = useMemo(() => {
    if (expectedResult?.type !== "substrate") return null
    return expectedResult.unsigned
  }, [expectedResult])

  const [signed, setSigned] = useState(false)
  const handleSigned = useCallback(
    async ({ signature }: { signature: HexString }) => {
      try {
        setSigned(true)
        await sendWithSignature(signature)
      } catch (err) {
        setError(err as Error)
      }
    },
    [sendWithSignature]
  )

  const parent = useMemo(() => document.getElementById("send-funds-container"), [])

  if (error) return <div className="text-alert-error">{error.message}</div>

  // hide when done
  if (!payload || signed) return null

  return (
    <LedgerSubstrate
      account={account}
      genesisHash={account.genesisHash}
      payload={payload}
      onReject={cancel}
      onSignature={handleSigned}
      parent={parent}
    />
  )
}

// default export to allow lazy loading
export default SendLedgerSubstrate
