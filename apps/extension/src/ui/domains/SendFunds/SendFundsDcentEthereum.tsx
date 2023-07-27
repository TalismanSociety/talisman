import { AccountJsonDcent } from "@core/domains/accounts/types"
import { HexString } from "@polkadot/util/types"
import SignDcentEthereum, { DcentEthereumSignRequest } from "@ui/domains/Sign/SignDcentEthereum"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { useSendFunds } from "./useSendFunds"

const SendFundsDcentEthereum = () => {
  const { t } = useTranslation("send-funds")
  const { from, evmTransaction, sendWithSignature, isLocked, setIsLocked, feeToken } =
    useSendFunds()
  const account = useAccountByAddress(from) as AccountJsonDcent

  const [error, setError] = useState<Error>()

  const [signed, setSigned] = useState(false)
  const handleSigned = useCallback(
    async (signature: HexString) => {
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

  const payload = useMemo<DcentEthereumSignRequest | undefined>(
    () =>
      evmTransaction?.transaction && feeToken
        ? {
            type: "transaction",
            transaction: evmTransaction?.transaction,
            token: feeToken,
          }
        : undefined,
    [evmTransaction?.transaction, feeToken]
  )

  if (error) return <div className="text-alert-error">{error.message}</div>

  if (!isLocked || signed)
    return (
      <Button
        disabled={!evmTransaction}
        className="w-full"
        primary
        onClick={sendToLedger(true)}
        processing={signed}
      >
        {t("Approve on DCENT")}
      </Button>
    )

  // hide until ready or after it's signed
  if (!payload) return null

  return (
    <SignDcentEthereum
      account={account}
      onReject={sendToLedger(false)}
      onSignature={handleSigned}
      payload={payload}
      containerId="main"
    />
  )
}

// default export to allow lazy loading
export default SendFundsDcentEthereum
