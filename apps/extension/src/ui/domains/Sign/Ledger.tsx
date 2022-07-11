import { AccountJsonHardware } from "@core/domains/accounts/types"
import { SignerPayloadJSON, SignerPayloadRaw } from "@core/domains/signing/types"
import { TypeRegistry } from "@polkadot/types"
import type { ExtrinsicPayload } from "@polkadot/types/interfaces"
import type { HexString } from "@polkadot/util/types"
import { Drawer } from "@talisman/components/Drawer"
import { useLedger } from "@ui/hooks/useLedger"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import styled from "styled-components"

import {
  LedgerConnectionStatus,
  LedgerConnectionStatusProps,
} from "../Account/LedgerConnectionStatus"
import { LedgerSigningStatus } from "./LedgerSigningStatus"

interface Props {
  account: AccountJsonHardware
  className?: string
  genesisHash?: string
  onSignature?: ({ signature }: { signature: HexString }) => void
  onReject: () => void
  payload: SignerPayloadJSON | SignerPayloadRaw
}

const registry = new TypeRegistry()

function isRawPayload(payload: SignerPayloadJSON | SignerPayloadRaw): payload is SignerPayloadRaw {
  return !!(payload as SignerPayloadRaw).data
}

const LedgerContent = styled.div`
  .cancel-link {
    margin-top: 0.5em;
    font-size: var(--font-size-small);
    color: var(--color-background-muted-2x);
    display: block;
    text-align: center;
    text-decoration: underline;
    cursor: pointer;
  }
`

const LedgerConnectionContent = styled.div`
  font-size: var(--font-size-small);
  line-height: 2rem;
  display: flex;
  max-height: 36rem;

  color: var(--color-foreground-muted);
  .title {
    color: var(--color-mid);
    margin-bottom: 1.6rem;
  }

  button {
    margin-top: 2.4rem;
    width: 100%;
  }

  .error {
    color: var(--color-status-error);
  }

  .warning {
    color: var(--color-status-warning);
  }

  .ledger-connection {
    width: 100%;
    margin: 0;
  }
`

const Ledger = ({
  account,
  className = "",
  genesisHash,
  onSignature,
  onReject,
  payload,
}: Props): React.ReactElement<Props> => {
  const [isSigning, setIsSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extrinsicPayload, setExtrinsicPayload] = useState<ExtrinsicPayload>()
  const { ledger, refresh, status, message, isReady, requiresManualRetry } = useLedger(genesisHash)

  const connectionStatus: LedgerConnectionStatusProps = useMemo(
    () => ({
      status: status === "ready" ? "connecting" : status,
      message: status === "ready" ? "Please approve from your Ledger." : message,
      refresh,
      requiresManualRetry,
    }),
    [refresh, status, message, requiresManualRetry]
  )

  useEffect(() => {
    if (isRawPayload(payload)) {
      setError("Message signing is not supported for hardware wallets.")
    } else {
      registry.setSignedExtensions(payload.signedExtensions)
      setExtrinsicPayload(
        registry.createType("ExtrinsicPayload", payload, { version: payload.version })
      )
    }
  }, [payload])

  const _onRefresh = useCallback(() => {
    refresh()
    setError(null)
  }, [refresh, setError])

  const signLedger = useCallback(() => {
    if (!ledger || !extrinsicPayload || !onSignature) {
      return
    }

    setError(null)
    return ledger
      .sign(extrinsicPayload.toU8a(true), account.accountIndex, account.addressOffset)
      .then(onSignature)
      .catch((e: Error) => {
        if (e.message === "Transaction rejected") return onReject()
        setError(e.message)
        setIsSigning(false)
      })
  }, [account, ledger, onSignature, onReject, extrinsicPayload, setError])

  useEffect(() => {
    if (isReady && !error && !isSigning) {
      setIsSigning(true)
      signLedger()?.finally(() => setIsSigning(false))
    }
  }, [signLedger, isSigning, error, isReady])

  return (
    <LedgerContent>
      {!error && (
        <LedgerConnectionContent className={`full-width ${className}`}>
          <LedgerConnectionStatus
            {...{ ...connectionStatus }}
            refresh={_onRefresh}
            hideOnSuccess={true}
          />
        </LedgerConnectionContent>
      )}
      {error && (
        <Drawer anchor="bottom" open={true}>
          <LedgerSigningStatus
            message={error ? error : ""}
            status={error ? "error" : isSigning ? "signing" : undefined}
            confirm={onReject}
          />
        </Drawer>
      )}
      <span className="cancel-link" onClick={onReject}>
        Cancel transaction
      </span>
    </LedgerContent>
  )
}

// default export to allow for lazy loading
export default Ledger
