import { AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { HexString } from "@polkadot/util/types"
import LedgerEthereum from "@ui/domains/Sign/LedgerEthereum"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useCallback, useState } from "react"
import { Button } from "talisman-ui"

import { useSendFunds } from "./useSendFunds"

const SendFundsLedgerEthereum = () => {
  const { from, evmTransaction, sendWithSignature, isLocked, setIsLocked } = useSendFunds()
  const account = useAccountByAddress(from) as AccountJsonHardwareEthereum

  const [error, setError] = useState<Error>()

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

  const sendToLedger = useCallback(
    (send: boolean) => () => {
      setIsLocked(send)
    },
    [setIsLocked]
  )

  if (error) return <div className="text-alert-error">{error.message}</div>

  if (!isLocked || signed)
    return (
      <Button
        disabled={!evmTransaction}
        className="mt-12 w-full"
        primary
        onClick={sendToLedger(true)}
        processing={signed}
      >
        Approve on Ledger
      </Button>
    )

  // hide until ready or after it's signed
  if (!evmTransaction) return null

  return (
    <LedgerEthereum
      account={account}
      method="transaction"
      onReject={sendToLedger(false)}
      onSignature={handleSigned}
      payload={evmTransaction.transaction}
      parent="main"
    />
  )
}

// default export to allow lazy loading
export default SendFundsLedgerEthereum
