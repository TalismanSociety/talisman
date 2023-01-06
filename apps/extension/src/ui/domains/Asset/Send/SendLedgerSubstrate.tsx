import { AccountJsonHardwareSubstrate } from "@core/domains/accounts/types"
import { roundToFirstInteger } from "@core/util/roundToFirstInteger"
import { HexString } from "@polkadot/util/types"
import { api } from "@ui/api"
import LedgerSubstrate from "@ui/domains/Sign/LedgerSubstrate"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { useIsKnownAddress } from "@ui/hooks/useIsKnownAddress"
import BigNumber from "bignumber.js"
import { useCallback, useMemo, useState } from "react"

import { useSendTokens } from "./context"
import { SendTokensInputs } from "./types"
import { useTransferableTokenById } from "./useTransferableTokens"

const SendLedgerSubstrate = () => {
  const { formData, expectedResult, sendWithSignature, cancel } = useSendTokens()
  const { from, to, amount, transferableTokenId } = formData as SendTokensInputs
  const [error, setError] = useState<Error>()
  const transferableToken = useTransferableTokenById(transferableTokenId)

  const account = useAccountByAddress(from) as AccountJsonHardwareSubstrate
  const knownAddress = useIsKnownAddress(to)

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

        // this analytics call is designed to mirror the shape of the other 'asset transfer' calls
        // it needs to be on the fronted because the ledger signing backend handler doesn't have access to all of the details
        const recipientTypeMap = {
          account: "ownAccount",
          contact: "contact",
        }

        api.analyticsCapture({
          eventName: "asset transfer",
          options: {
            toAddress: to,
            amount: expectedResult
              ? roundToFirstInteger(Number(expectedResult?.transfer.amount.planck))
              : "unknown",
            tokenId: transferableTokenId,
            chainId: transferableToken?.chainId || "unknown",
            internal: !!knownAddress,
            recipientType: knownAddress ? recipientTypeMap[knownAddress.type] : "external",
            hardware: true,
          },
        })
      } catch (err) {
        setError(err as Error)
      }
    },
    [
      knownAddress,
      sendWithSignature,
      to,
      transferableToken?.chainId,
      expectedResult,
      transferableTokenId,
    ]
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
