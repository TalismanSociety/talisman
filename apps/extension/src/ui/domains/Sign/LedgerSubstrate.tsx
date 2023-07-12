import { AccountJsonHardwareSubstrate } from "@core/domains/accounts/types"
import { SignerPayloadJSON, SignerPayloadRaw } from "@core/domains/signing/types"
import { log } from "@core/log"
import { TypeRegistry } from "@polkadot/types"
import type { HexString } from "@polkadot/util/types"
import { classNames } from "@talismn/util"
import { useLedgerSubstrate } from "@ui/hooks/ledger/useLedgerSubstrate"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Drawer } from "talisman-ui"
import { Button } from "talisman-ui"

import {
  LedgerConnectionStatus,
  LedgerConnectionStatusProps,
} from "../Account/LedgerConnectionStatus"
import { LedgerSigningStatus } from "./LedgerSigningStatus"

interface Props {
  account: AccountJsonHardwareSubstrate
  className?: string
  genesisHash?: string
  onSignature?: ({ signature }: { signature: HexString }) => void
  onReject: () => void
  payload: SignerPayloadJSON | SignerPayloadRaw
  containerId?: string
}

const registry = new TypeRegistry()

function isRawPayload(payload: SignerPayloadJSON | SignerPayloadRaw): payload is SignerPayloadRaw {
  return !!(payload as SignerPayloadRaw).data
}

const LedgerSubstrate = ({
  account,
  className = "",
  genesisHash,
  onSignature,
  onReject,
  payload,
  containerId,
}: Props): React.ReactElement<Props> => {
  const { t } = useTranslation("request")
  const [isSigning, setIsSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unsigned, setUnsigned] = useState<Uint8Array>()
  const { ledger, refresh, status, message, isReady, requiresManualRetry } =
    useLedgerSubstrate(genesisHash)

  const connectionStatus: LedgerConnectionStatusProps = useMemo(
    () => ({
      status: status === "ready" ? "connecting" : status,
      message: status === "ready" ? t("Please approve from your Ledger.") : message,
      refresh,
      requiresManualRetry,
    }),
    [refresh, status, message, requiresManualRetry, t]
  )

  useEffect(() => {
    if (isRawPayload(payload)) {
      setError(t("Message signing is not supported for hardware wallets."))
    } else {
      if (payload.signedExtensions) registry.setSignedExtensions(payload.signedExtensions)
      setUnsigned(
        registry.createType("ExtrinsicPayload", payload, { version: payload.version }).toU8a(true)
      )
    }
  }, [payload, t])

  const _onRefresh = useCallback(() => {
    refresh()
    setError(null)
  }, [refresh, setError])

  const signLedger = useCallback(async () => {
    if (!ledger || !unsigned || !onSignature) {
      return
    }

    setError(null)

    return ledger
      .sign(unsigned, account.accountIndex, account.addressOffset)
      .then(onSignature)
      .catch((e: Error) => {
        if (e.message === "Transaction rejected") return onReject()
        if (e.message === "Txn version not supported")
          setError(
            t(
              "This type of transaction is not supported on your ledger. You should check for firmware updates in Ledger Live before trying again."
            )
          )
        else {
          log.error("ledger sign Substrate : " + e.message, { err: e })
          setError(e.message)
        }
        setIsSigning(false)
      })
  }, [account, ledger, onSignature, onReject, unsigned, setError, t])

  useEffect(() => {
    if (isReady && !error && !isSigning) {
      setIsSigning(true)
      signLedger().finally(() => setIsSigning(false))
    }
  }, [signLedger, isSigning, error, isReady])

  return (
    <div className={classNames("flex w-full flex-col gap-6", className)}>
      {!error && (
        <LedgerConnectionStatus
          {...{ ...connectionStatus }}
          refresh={_onRefresh}
          hideOnSuccess={true}
        />
      )}
      <Button className="w-full" onClick={onReject}>
        {t("Cancel")}
      </Button>
      {error && (
        <Drawer anchor="bottom" isOpen={true} containerId={containerId}>
          <LedgerSigningStatus
            message={error ? error : ""}
            status={error ? "error" : isSigning ? "signing" : undefined}
            confirm={onReject}
          />
        </Drawer>
      )}
    </div>
  )
}

// default export to allow for lazy loading
export default LedgerSubstrate
