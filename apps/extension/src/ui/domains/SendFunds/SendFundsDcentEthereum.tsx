import { AccountJsonDcent } from "@core/domains/accounts/types"
import { HexString } from "@polkadot/util/types"
import SignDcentEthereum from "@ui/domains/Sign/SignDcentEthereum"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useCallback, useState } from "react"

import { useSendFunds } from "./useSendFunds"

const SendFundsDcentEthereum = () => {
  const { from, evmTransaction, sendWithSignature, setIsLocked } = useSendFunds()
  const account = useAccountByAddress(from) as AccountJsonDcent

  const [error, setError] = useState<Error>()

  const handleSigned = useCallback(
    async ({ signature }: { signature: HexString }) => {
      try {
        await sendWithSignature(signature)
      } catch (err) {
        setError(err as Error)
      }
    },
    [sendWithSignature]
  )

  if (error) return <div className="text-alert-error">{error.message}</div>

  return (
    <SignDcentEthereum
      account={account}
      method="eth_sendTransaction"
      payload={evmTransaction?.transaction}
      onReject={() => setIsLocked(false)}
      onSignature={handleSigned}
      onWaitingChanged={setIsLocked}
      containerId="main"
    />
  )
}

// default export to allow lazy loading
export default SendFundsDcentEthereum
