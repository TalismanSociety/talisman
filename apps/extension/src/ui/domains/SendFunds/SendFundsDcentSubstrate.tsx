import { log } from "@core/log"
import { roundToFirstInteger } from "@core/util/roundToFirstInteger"
import { HexString } from "@polkadot/util/types"
import { planckToTokens } from "@talismn/util"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useIsKnownAddress } from "@ui/hooks/useIsKnownAddress"
import useToken from "@ui/hooks/useToken"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { SignDcentSubstrate } from "../Sign/SignDcentSubstrate"
import { useSendFunds } from "./useSendFunds"

const SendFundsDcentSubstrate = () => {
  const { t } = useTranslation("send-funds")
  const { tokenId, to, amount } = useSendFundsWizard()
  const { subTransaction, sendWithSignature, isLocked, setIsLocked } = useSendFunds()
  const [error, setError] = useState<Error>()

  const token = useToken(tokenId)
  const knownAddress = useIsKnownAddress(to)

  const [signed, setSigned] = useState(false)
  const handleSigned = useCallback(
    async (signature: HexString) => {
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
        log.error("handleSigned", err)
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

  if (error) return <div className="text-alert-error">{error.message}</div>

  if (!isLocked || signed)
    return (
      <Button
        disabled={!subTransaction?.unsigned}
        className="w-full"
        primary
        onClick={sendToLedger(true)}
        processing={signed}
      >
        {t("Approve on D'CENT")}
      </Button>
    )

  // hide when done
  if (!subTransaction?.unsigned || !subTransaction.partialFee) return null

  return (
    <SignDcentSubstrate
      fee={subTransaction.partialFee}
      payload={subTransaction.unsigned}
      onCancel={sendToLedger(false)}
      onSigned={handleSigned}
      containerId="main"
    />
  )
}

// default export to allow lazy loading
export default SendFundsDcentSubstrate
