import { classNames } from "@talismn/util"
import { FC, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { AccountJsonHardwareEthereum } from "@extension/core"
import { log } from "@extension/shared"
import { getCustomTalismanLedgerError, TalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerEthereum } from "@ui/hooks/ledger/useLedgerEthereum"

import { ErrorMessageDrawer } from "./ErrorMessageDrawer"
import { SignHardwareEthereumProps } from "./SignHardwareEthereum"

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

  const [{ status, error }, setState] = useState<{
    status: "ready" | "signing" | "signed"
    error: TalismanLedgerError | null
  }>({ status: "ready", error: null })

  const { sign } = useLedgerEthereum()

  // reset
  useEffect(() => {
    setState({ status: "ready", error: null })
  }, [payload])

  const setError = useCallback((error: TalismanLedgerError | null) => {
    setState({ status: "ready", error })
  }, [])

  const signWithLedger = useCallback(async () => {
    if (!payload || !onSigned || !account) return

    onSentToDevice?.(true)
    setState({ status: "signing", error: null })

    try {
      const signature = await sign(
        Number(evmNetworkId),
        method,
        payload,
        (account as AccountJsonHardwareEthereum).path,
      )

      // await so we can keep the spinning loader until popup closes
      await onSigned({ signature })
    } catch (err) {
      const errCheck = err as Error & { statusCode?: number; reason?: string }
      if (errCheck.reason === "invalid object key - maxPriorityFeePerGas") {
        setError(
          getCustomTalismanLedgerError(
            t("Sorry, Talisman doesn't support signing transactions with Ledger on this network."),
          ),
        )
      } else {
        const error = getCustomTalismanLedgerError(err)
        log.error("signLedger", { error })
        setError(error)
      }
    } finally {
      onSentToDevice?.(false)
    }
  }, [account, evmNetworkId, method, onSentToDevice, onSigned, payload, setError, sign, t])

  return (
    <div
      className={classNames(
        "grid w-full gap-8",
        onCancel ? "grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {!!onCancel && <Button onClick={onCancel}>{t("Cancel")}</Button>}
      <Button primary processing={status !== "ready"} onClick={signWithLedger} className="px-4">
        {t("Approve on Ledger")}
      </Button>
      <ErrorMessageDrawer
        message={error?.message}
        containerId={containerId}
        onDismiss={() => setError(null)}
      />
    </div>
  )
}
