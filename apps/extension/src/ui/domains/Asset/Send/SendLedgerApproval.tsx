import { AccountJsonHardware } from "@core/types"
import { TypeRegistry } from "@polkadot/types"
import { formatLedgerSigningError } from "@talisman/util/formatLedgerErrorMessage"
import {
  LedgerConnectionStatus,
  LedgerConnectionStatusProps,
} from "@ui/domains/Account/LedgerConnectionStatus"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import useChain from "@ui/hooks/useChain"
import { useLedger } from "@ui/hooks/useLedger"
import useToken from "@ui/hooks/useToken"
import { useCallback, useEffect, useMemo, useState } from "react"
import styled from "styled-components"

import { useSendTokens } from "./context"
import { SendTokensExpectedResult, SendTokensInputs } from "./types"

const SendLedgerApprovalContainer = styled.div`
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

// keep it global, we can and will re-use this across requests
const registry = new TypeRegistry()

const SendLedgerApproval = () => {
  const { formData, expectedResult, sendWithSignature, cancel } = useSendTokens()
  const { from, tokenId } = formData as SendTokensInputs
  const [isSigning, setIsSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [error, setError] = useState<string>()

  const account = useAccountByAddress(from) as AccountJsonHardware
  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)
  const { ledger, isReady, status, message, refresh, requiresManualRetry, network } = useLedger(
    chain?.genesisHash
  )

  const payload = useMemo(() => {
    const { unsigned } = expectedResult as SendTokensExpectedResult
    registry.setSignedExtensions(unsigned.signedExtensions)
    return registry.createType("ExtrinsicPayload", unsigned, { version: unsigned.version })
  }, [expectedResult])

  const approveIfReady = useCallback(async () => {
    try {
      if (!account || !ledger || !isReady || isSigning || signed || error || status !== "ready")
        return
      const { accountIndex, addressOffset } = account

      setError(undefined)
      setIsSigning(true)

      const { signature } = await ledger.sign(payload.toU8a(true), accountIndex, addressOffset)
      await sendWithSignature(signature)

      setSigned(true)
    } catch (err) {
      setError((err as Error).message)
    }
    setIsSigning(false)
  }, [account, ledger, isReady, isSigning, signed, error, status, payload, sendWithSignature])

  useEffect(() => {
    approveIfReady()
  }, [approveIfReady])

  useEffect(() => {
    setError(undefined)
    setSigned(false)
  }, [isReady])

  const connectionStatus: LedgerConnectionStatusProps = useMemo(() => {
    if (error)
      return {
        refresh,
        ...formatLedgerSigningError(error, network ?? undefined),
      }

    if (signed)
      return {
        refresh,
        status: "ready",
        message: "Transaction signed successfully.",
        requiresManualRetry: false,
      }

    return {
      status: status === "ready" ? "connecting" : status,
      message: status === "ready" ? "Please approve from your Ledger." : message,
      refresh,
      requiresManualRetry,
    }
  }, [error, refresh, network, signed, status, message, requiresManualRetry])

  // hide when done
  if (signed) return null

  return (
    <SendLedgerApprovalContainer>
      <LedgerConnectionStatus {...connectionStatus} />
      <span className="cancel-link" onClick={cancel}>
        Cancel transaction
      </span>
    </SendLedgerApprovalContainer>
  )
}

// default export to allow lazy loading
export default SendLedgerApproval
