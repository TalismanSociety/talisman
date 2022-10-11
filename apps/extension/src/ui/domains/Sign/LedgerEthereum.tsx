import { AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { Drawer } from "@talisman/components/Drawer"
import { useLedgerEthereum } from "@ui/hooks/useLedgerEthereum"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import styled from "styled-components"
import {
  LedgerConnectionStatus,
  LedgerConnectionStatusProps,
} from "../Account/LedgerConnectionStatus"
import { LedgerSigningStatus } from "./LedgerSigningStatus"
import { ethers } from "ethers"
import LedgerEthereumApp from "@ledgerhq/hw-app-eth"
import { TypedDataUtils, SignTypedDataVersion } from "@metamask/eth-sig-util"

// TODO rename payload type ?
export type LedgerEthereumSignMethod =
  | "transaction"
  | "personal_sign"
  | "eth_signTypedData"
  | "eth_signTypedData_v1"
  | "eth_signTypedData_v3"
  | "eth_signTypedData_v4"

type LedgerEthereumProps = {
  account: AccountJsonHardwareEthereum
  className?: string
  onSignature?: (result: { signature: `0x${string}` }) => void
  onReject: () => void
  method: LedgerEthereumSignMethod
  payload: any // string message, typed object for eip712, TransactionRequest for tx
  manualSend?: boolean // requests user to click a button to send the payload to the ledger
  onSendToLedger?: () => void // triggered when tx is sent to the ledger
}

const signWithLedger = async (
  ledger: LedgerEthereumApp,
  method: LedgerEthereumSignMethod,
  payload: any,
  accountPath: string
): Promise<`0x${string}`> => {
  // uncomment someday
  // if (["eth_signTypedData", "eth_signTypedData_v3", "eth_signTypedData_v4"].includes(method)) {
  //   const jsonMessage = typeof payload === "string" ? JSON.parse(payload) : payload

  //   const sig = await ledger.signEIP712Message(accountPath, jsonMessage)
  //   sig.r = "0x" + sig.r
  //   sig.s = "0x" + sig.s
  //   return ethers.utils.joinSignature(sig) as `0x${string}`
  // }

  if (method === "eth_signTypedData_v4") {
    const jsonMessage = typeof payload === "string" ? JSON.parse(payload) : payload

    // often problems here with missing salt, or chainId beeing string instead of number
    // => in most cases we cannot use ledger.signEIP712Message() without altering the payload
    // => let's hash using MM libraries, the user will only see those hashes on his ledger

    const { domain, types, primaryType, message } = TypedDataUtils.sanitizeData(jsonMessage)
    const domainSeparatorHex = TypedDataUtils.hashStruct(
      "EIP712Domain",
      domain,
      types,
      SignTypedDataVersion.V4
    ).toString("hex")
    const hashStructMessageHex = TypedDataUtils.hashStruct(
      primaryType as string,
      message,
      types,
      SignTypedDataVersion.V4
    ).toString("hex")

    const sig = await ledger.signEIP712HashedMessage(
      accountPath,
      domainSeparatorHex,
      hashStructMessageHex
    )
    sig.r = "0x" + sig.r
    sig.s = "0x" + sig.s
    return ethers.utils.joinSignature(sig) as `0x${string}`
  }
  if (method === "personal_sign") {
    const messageHex = ethers.utils
      .hexlify(typeof payload === "string" ? ethers.utils.toUtf8Bytes(payload) : payload)
      .substring(2)

    const sig = await ledger.signPersonalMessage(accountPath, messageHex)
    sig.r = "0x" + sig.r
    sig.s = "0x" + sig.s
    return ethers.utils.joinSignature(sig) as `0x${string}`
  }
  if (method === "transaction") {
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
    } = await ethers.utils.resolveProperties(payload as ethers.providers.TransactionRequest)

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
    }
    const unsignedTx = ethers.utils.serializeTransaction(baseTx).substring(2)
    const sig = await ledger.signTransaction(accountPath, unsignedTx, null) // resolver)

    return ethers.utils.serializeTransaction(payload, {
      v: ethers.BigNumber.from("0x" + sig.v).toNumber(),
      r: "0x" + sig.r,
      s: "0x" + sig.s,
    }) as `0x${string}`
  }

  // sign typed data v0, v1, v3...
  throw new Error("This type of message cannot be signed with ledger.")
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

const LedgerEthereum: FC<LedgerEthereumProps> = ({
  account,
  className = "",
  method,
  payload,
  manualSend,
  onSendToLedger,
  onSignature,
  onReject,
}) => {
  const [autoSend, setAutoSend] = useState(!manualSend)
  const [isSigning, setIsSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  const _onRefresh = useCallback(() => {
    refresh()
    setError(null)
  }, [refresh, setError])

  const signLedger = useCallback(() => {
    if (!ledger || !onSignature || !autoSend) {
      return
    }

    setError(null)
    onSendToLedger?.()
    return signWithLedger(ledger, method, payload, account.path)
      .then((signature) => onSignature({ signature }))
      .catch((e: any) => {
        if (e.statusCode === 27013) return onReject()
        setError(e.message)
        setIsSigning(false)
        setAutoSend(!manualSend)
      })
  }, [
    ledger,
    onSignature,
    autoSend,
    onSendToLedger,
    method,
    payload,
    account.path,
    onReject,
    manualSend,
  ])

  useEffect(() => {
    if (isReady && !error && !isSigning && autoSend) {
      setIsSigning(true)
      signLedger()?.finally(() => setIsSigning(false))
    }
  }, [signLedger, isSigning, error, isReady, autoSend])

  const handleSendClick = useCallback(() => {
    setAutoSend(true)
  }, [])

  return (
    <LedgerContent>
      {!error && (
        <LedgerConnectionContent className={`full-width ${className}`}>
          {isReady && !autoSend ? (
            <LedgerConnectionStatus
              status="ready"
              message="Click to send request to ledger"
              requiresManualRetry
              refresh={handleSendClick}
            />
          ) : (
            <LedgerConnectionStatus {...{ ...connectionStatus }} refresh={_onRefresh} />
          )}
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
