import { AccountJsonHardwareSubstrate } from "@core/domains/accounts/types"
import { roundToFirstInteger } from "@core/util/roundToFirstInteger"
import { HexString } from "@polkadot/util/types"
import { planckToTokens } from "@talismn/util"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import LedgerSubstrate from "@ui/domains/Sign/LedgerSubstrate"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { useIsKnownAddress } from "@ui/hooks/useIsKnownAddress"
import useToken from "@ui/hooks/useToken"
import { useCallback, useMemo, useState } from "react"
import { Button } from "talisman-ui"

import { useSendFundsConfirm } from "./useSendFundsConfirm"

const SendFundsLedgerSubstrate = () => {
  const { tokenId, from, to, amount } = useSendFundsWizard()
  const { subTransaction, sendWithSignature, isLocked, setIsLocked } = useSendFundsConfirm()
  const [error, setError] = useState<Error>()

  const token = useToken(tokenId)
  const account = useAccountByAddress(from) as AccountJsonHardwareSubstrate
  const knownAddress = useIsKnownAddress(to)

  const [signed, setSigned] = useState(false)
  const handleSigned = useCallback(
    async ({ signature }: { signature: HexString }) => {
      try {
        setSigned(true)
        await sendWithSignature(signature)

        // this analytics call is designed to mirror the shape of the other 'asset transfer' calls
        // it needs to be on the fronted because the ledger signing backend handler doesn't have access to all of the details
        const recipientTypeMap = {
          account: "ownAccount",
          contact: "contact",
        }

        // TODO move this away from here
        api.analyticsCapture({
          eventName: "asset transfer",
          options: {
            toAddress: to,
            amount: token
              ? roundToFirstInteger(Number(planckToTokens(amount, token.decimals)))
              : "unknown",
            tokenId,
            chainId: token?.chain?.id || "unknown",
            internal: !!knownAddress,
            recipientType: knownAddress ? recipientTypeMap[knownAddress.type] : "external",
            hardware: true,
          },
        })
      } catch (err) {
        setError(err as Error)
      }
    },
    [sendWithSignature, to, token, amount, tokenId, knownAddress]
  )

  const sendToLedger = useCallback(
    (send: boolean) => () => {
      setIsLocked(send)
    },
    [setIsLocked]
  )

  // TODO test this case
  if (error) return <div className="text-alert-error">{error.message}</div>

  if (!isLocked || signed)
    return (
      <Button
        disabled={!subTransaction}
        className="mt-12 w-full"
        primary
        onClick={sendToLedger(true)}
        processing={signed}
      >
        Send to Ledger
      </Button>
    )

  // hide when done
  if (!subTransaction) return null

  return (
    <LedgerSubstrate
      account={account}
      genesisHash={account.genesisHash}
      payload={subTransaction.unsigned}
      onReject={sendToLedger(false)}
      onSignature={handleSigned}
    />
  )
}

// default export to allow lazy loading
export default SendFundsLedgerSubstrate
