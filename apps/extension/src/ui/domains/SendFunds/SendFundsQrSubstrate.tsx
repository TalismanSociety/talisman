import { AccountJsonQr, roundToFirstInteger } from "@extension/core"
import { HexString } from "@polkadot/util/types"
import { planckToTokens } from "@talismn/util"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { QrSubstrate } from "@ui/domains/Sign/Qr/QrSubstrate"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useChain from "@ui/hooks/useChain"
import { useIsKnownAddress } from "@ui/hooks/useIsKnownAddress"
import useToken from "@ui/hooks/useToken"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { useSendFunds } from "./useSendFunds"

const SendFundsQrSubstrate = () => {
  const { t } = useTranslation("send-funds")
  const { tokenId, from, to, amount } = useSendFundsWizard()
  const { subTransaction, sendWithSignature, isLocked, setIsLocked } = useSendFunds()
  const [error, setError] = useState<Error>()

  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)
  const account = useAccountByAddress(from) ?? undefined
  const knownAddress = useIsKnownAddress(to)

  const [signed, setSigned] = useState(false)
  const handleSigned = useCallback(
    async ({ signature }: { signature: HexString }) => {
      try {
        setSigned(true)
        await sendWithSignature(signature)

        // this analytics call is designed to mirror the shape of the other 'asset transfer' calls
        // it needs to be on the fronted because the qr signing backend handler doesn't have access to all of the details
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
            qr: true,
          },
        })
      } catch (err) {
        setError(err as Error)
      }
    },
    [sendWithSignature, to, token, amount, tokenId, knownAddress]
  )

  const showQrApproval = useCallback(
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
        onClick={showQrApproval(true)}
        processing={signed}
      >
        {t("Approve with QR")}
      </Button>
    )

  // hide when done
  if (!account) return null
  if (!subTransaction?.unsigned) return null

  return (
    <QrSubstrate
      account={account as AccountJsonQr}
      genesisHash={chain?.genesisHash ?? account?.genesisHash ?? undefined}
      payload={subTransaction.unsigned}
      onReject={showQrApproval(false)}
      onSignature={handleSigned}
      containerId="main"
      skipInit
      // the send funds popup has a narrower margin on the bottom
      // than the sign tx popup does
      narrowMargin
    />
  )
}

// default export to allow lazy loading
export default SendFundsQrSubstrate
