import { log } from "extension-shared"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"

import { getTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerEthereum } from "@ui/hooks/ledger/useLedgerEthereum"

import { SignHardwareEthereumProps } from "./SignHardwareEthereum"
import { SignLedgerBase } from "./SignLedgerBase"
import { useSignLedgerBase } from "./useSignLedgerBase"

export const SignLedgerEthereum: FC<SignHardwareEthereumProps> = ({
  evmNetworkId,
  account,
  className = "",
  method,
  payload,
  containerId,
  onSentToDevice,
  onSigned,
  onCancel,
}) => {
  const { t } = useTranslation()

  const { isSigning, error, setIsSigning, setError } = useSignLedgerBase()

  const { sign } = useLedgerEthereum()

  const signWithLedger = useCallback(async () => {
    if (!payload || !onSigned || !account) return

    onSentToDevice?.(true)
    setIsSigning(true)

    try {
      const signature = await sign(Number(evmNetworkId), method, payload, account)

      // await so we can keep the spinning loader until popup closes
      await onSigned({ signature })
    } catch (err) {
      const errCheck = err as Error & { statusCode?: number; reason?: string }
      if (errCheck.reason === "invalid object key - maxPriorityFeePerGas") {
        setError(
          getTalismanLedgerError(
            t("Sorry, Talisman doesn't support signing transactions with Ledger on this network."),
          ),
        )
      } else {
        const error = getTalismanLedgerError(err)
        log.error("signLedger", { error })
        setError(error)
      }
    } finally {
      onSentToDevice?.(false)
    }
  }, [
    account,
    evmNetworkId,
    method,
    onSentToDevice,
    onSigned,
    payload,
    setError,
    setIsSigning,
    sign,
    t,
  ])

  return (
    <SignLedgerBase
      containerId={containerId}
      isProcessing={isSigning}
      error={error}
      className={className}
      onSignClick={signWithLedger}
      onDismissErrorClick={() => setError(null)}
      onCancel={onCancel}
    />
  )
}
