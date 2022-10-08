import { AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { SignerPayloadJSON, SignerPayloadRaw } from "@core/domains/signing/types"
import { TypeRegistry } from "@polkadot/types"
import type { ExtrinsicPayload } from "@polkadot/types/interfaces"
import { Drawer } from "@talisman/components/Drawer"
import { useLedgerEthereum } from "@ui/hooks/useLedgerEthereum"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import styled from "styled-components"
import {
  LedgerConnectionStatus,
  LedgerConnectionStatusProps,
} from "../Account/LedgerConnectionStatus"
import { LedgerSigningStatus } from "./LedgerSigningStatus"
import { ethers } from "ethers"

interface Props {
  account: AccountJsonHardwareEthereum
  className?: string
  genesisHash?: string
  onSignature?: (result: { signature: `0x${string}` }) => void
  onReject: () => void
  method: "eip712" | "transaction" | "personalSign"
  payload: any // string message, typed object for eip712, TransactionRequest for tx
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

const LedgerEthereum = ({
  account,
  className = "",
  onSignature,
  onReject,
  method,
  payload,
}: Props): React.ReactElement<Props> => {
  const [isSigning, setIsSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extrinsicPayload, setExtrinsicPayload] = useState<ExtrinsicPayload>()
  const { ledger, refresh, status, message, isReady, requiresManualRetry } = useLedgerEthereum()

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

    const sign = async (): Promise<`0x${string}`> => {
      if (method === "eip712") {
        const jsonMessage = typeof payload === "string" ? JSON.parse(payload) : payload

        const sig = await ledger.signEIP712Message(account.path, jsonMessage)
        sig.r = "0x" + sig.r
        sig.s = "0x" + sig.s
        return ethers.utils.joinSignature(sig) as `0x${string}`
      }
      if (method === "personalSign") {
        const messageHex = ethers.utils
          .hexlify(typeof payload === "string" ? ethers.utils.toUtf8Bytes(payload) : payload)
          .substring(2)

        const sig = await ledger.signPersonalMessage(account.path, messageHex)
        sig.r = "0x" + sig.r
        sig.s = "0x" + sig.s
        return ethers.utils.joinSignature(sig) as `0x${string}`
      }
      if (method === "transaction") {
        const tx = await ethers.utils.resolveProperties(
          payload as ethers.providers.TransactionRequest
        )
        const {
          to,
          nonce,
          gasLimit,
          gasPrice,
          data,
          value,
          chainId,
          type,
          maxPriorityFeePerGas,
          maxFeePerGas,
        } = tx
        const baseTx: ethers.utils.UnsignedTransaction = {
          to,
          nonce: nonce ? ethers.BigNumber.from(nonce).toNumber() : undefined,
          gasLimit,
          gasPrice,
          data,
          value,
          chainId,
          type,
          maxPriorityFeePerGas,
          maxFeePerGas,
          // accessList, // unsupported on ledger
        }
        // const baseTx: ethers.utils.UnsignedTransaction = {
        //   chainId: tx.chainId || undefined,
        //   data: tx.data || undefined,
        //   gasLimit: tx.gasLimit || undefined,
        //   gasPrice: tx.gasPrice || undefined,
        //   nonce: tx.nonce ? ethers.BigNumber.from(tx.nonce).toNumber() : undefined,
        //   to: tx.to || undefined,
        //   value: tx.value || undefined,
        //   type: tx.type
        // }
        const unsignedTx = ethers.utils.serializeTransaction(baseTx).substring(2)
        const sig = await ledger.signTransaction(account.path, unsignedTx) // resolver)

        return ethers.utils.serializeTransaction(payload, {
          v: ethers.BigNumber.from("0x" + sig.v).toNumber(),
          r: "0x" + sig.r,
          s: "0x" + sig.s,
        }) as `0x${string}`
      }
      throw new Error("Unsupported method")
    }

    setError(null)
    return sign()
      .then((signature) => onSignature({ signature }))
      .catch((e: Error) => {
        if (e.message === "Transaction rejected") return onReject()
        setError(e.message)
        setIsSigning(false)
      })
  }, [ledger, extrinsicPayload, onSignature, method, payload, account.path, onReject])

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
export default LedgerEthereum
