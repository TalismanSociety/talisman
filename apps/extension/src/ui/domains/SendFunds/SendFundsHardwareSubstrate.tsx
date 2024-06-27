import { SignerPayloadJSON, roundToFirstInteger } from "@extension/core"
import { log } from "@extension/shared"
import { HexString } from "@polkadot/util/types"
import { planckToTokens } from "@talismn/util"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useIsKnownAddress } from "@ui/hooks/useIsKnownAddress"
import useToken from "@ui/hooks/useToken"
import { useCallback, useState } from "react"

import { SignHardwareSubstrate } from "../Sign/SignHardwareSubstrate"
import { useSendFunds } from "./useSendFunds"

export const SendFundsHardwareSubstrate = () => {
  const { tokenId, to, amount } = useSendFundsWizard()
  const { subTransaction, sendWithSignature, setIsLocked } = useSendFunds()
  const [error, setError] = useState<Error>()

  const token = useToken(tokenId)
  const knownAddress = useIsKnownAddress(to)

  const handleSigned = useCallback(
    async ({ signature, payload }: { signature: HexString; payload?: SignerPayloadJSON }) => {
      try {
        await sendWithSignature(signature, payload)

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
        log.error("handleSigned", { err })
      }
    },
    [sendWithSignature, to, token, amount, tokenId, knownAddress]
  )

  if (error) return <div className="text-alert-error">{error.message}</div>

  return (
    <SignHardwareSubstrate
      fee={subTransaction?.partialFee}
      payload={subTransaction?.unsigned}
      registry={subTransaction?.registry}
      shortMetadata={subTransaction?.shortMetadata}
      onSentToDevice={setIsLocked}
      onSigned={handleSigned}
      containerId="main"
    />
  )
}
