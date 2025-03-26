import { HexString } from "@polkadot/util/types"
import { log } from "extension-shared"
import { useCallback, useState } from "react"

import { useAccountByAddress } from "@ui/state"

import { SignHardwareEthereum } from "../Sign/SignHardwareEthereum"
import { useSendFunds } from "./useSendFunds"

export const SendFundsHardwareEthereum = () => {
  const { from, evmTransaction, sendWithSignature, setIsLocked, evmNetwork } = useSendFunds()
  const account = useAccountByAddress(from)

  const [error, setError] = useState<Error>()

  const handleSigned = useCallback(
    async ({ signature }: { signature: HexString }) => {
      try {
        await sendWithSignature(signature)
      } catch (err) {
        log.error("handleSigned", { err })
        setError(err as Error)
      }
    },
    [sendWithSignature],
  )

  if (error) return <div className="text-alert-error">{error.message}</div>
  if (!account || account.type !== "ledger-ethereum") return null

  return (
    <SignHardwareEthereum
      evmNetworkId={evmNetwork?.id}
      account={account}
      method="eth_sendTransaction"
      payload={evmTransaction?.transaction}
      onSigned={handleSigned}
      onSentToDevice={setIsLocked}
      containerId="main"
    />
  )
}
