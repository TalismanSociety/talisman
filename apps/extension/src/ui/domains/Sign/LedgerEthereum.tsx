import { AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { log } from "@core/log"
import { bufferToHex, isHexString, stripHexPrefix } from "@ethereumjs/util"
import LedgerEthereumApp from "@ledgerhq/hw-app-eth"
import { SignTypedDataVersion, TypedDataUtils } from "@metamask/eth-sig-util"
import { Drawer } from "@talisman/components/Drawer"
import { classNames } from "@talismn/util"
import { useLedgerEthereum } from "@ui/hooks/ledger/useLedgerEthereum"
import { ethers } from "ethers"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "talisman-ui"

import {
  LedgerConnectionStatus,
  LedgerConnectionStatusProps,
} from "../Account/LedgerConnectionStatus"
import { LedgerSigningStatus } from "./LedgerSigningStatus"

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
  method: LedgerEthereumSignMethod
  payload: any // string message, typed object for eip712, TransactionRequest for tx
  manualSend?: boolean // requests user to click a button to send the payload to the ledger
  parent?: HTMLElement | null
  onSignature?: (result: { signature: `0x${string}` }) => void
  onReject: () => void
  onSendToLedger?: () => void // triggered when tx is sent to the ledger
}

const signWithLedger = async (
  ledger: LedgerEthereumApp,
  method: LedgerEthereumSignMethod,
  payload: any,
  accountPath: string
): Promise<`0x${string}`> => {
  // TODO Uncomment wen this method actually works
  // if (["eth_signTypedData", "eth_signTypedData_v3", "eth_signTypedData_v4"].includes(method)) {
  //   const jsonMessage = typeof payload === "string" ? JSON.parse(payload) : payload

  //   const sig = await ledger.signEIP712Message(accountPath, jsonMessage)
  //   sig.r = "0x" + sig.r
  //   sig.s = "0x" + sig.s
  //   return ethers.utils.joinSignature(sig) as `0x${string}`
  // }

  if (method === "eth_signTypedData_v4") {
    const jsonMessage = typeof payload === "string" ? JSON.parse(payload) : payload

    // at this time we cannot use ledger.signEIP712Message() (see comments above) without altering the payload (missing salt & wrong time for chainId)
    // => let's hash using MM libraries, what's annoying is that the user will only see those hashes on his ledger

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
    // ensure that it is hex encoded
    const messageHex = isHexString(payload) ? payload : bufferToHex(Buffer.from(payload, "utf8"))

    const sig = await ledger.signPersonalMessage(accountPath, stripHexPrefix(messageHex))
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
    const unsignedTx = stripHexPrefix(ethers.utils.serializeTransaction(baseTx))
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

const LedgerEthereum: FC<LedgerEthereumProps> = ({
  account,
  className = "",
  method,
  payload,
  manualSend,
  parent,
  onSendToLedger,
  onSignature,
  onReject,
}) => {
  const [autoSend, setAutoSend] = useState(!manualSend)
  const [isSigning, setIsSigning] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { ledger, refresh, status, message, isReady, requiresManualRetry } = useLedgerEthereum()

  // reset
  useEffect(() => {
    setIsSigned(false)
  }, [method, payload])

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

  const signLedger = useCallback(async () => {
    if (!ledger || !onSignature || !autoSend) {
      return
    }

    setError(null)
    onSendToLedger?.()
    try {
      const signature = await signWithLedger(ledger, method, payload, account.path)
      setIsSigned(true)
      onSignature({ signature })
    } catch (err) {
      const error = err as Error & { statusCode?: number; reason?: string }
      // if user rejects from device
      if (error.statusCode === 27013) return onReject()

      log.error("ledger sign Ethereum", { error })

      // ETH ledger app requires EIP-1559 type 2 transactions
      if (error.reason === "invalid object key - maxPriorityFeePerGas")
        setError(
          "Sorry, Talisman doesn't support signing transactions with Ledger on this network."
        )
      else setError(error.reason ?? error.message)
      setIsSigning(false)
      setAutoSend(!manualSend)
    }
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
    if (isReady && !error && !isSigning && autoSend && !isSigned) {
      setIsSigning(true)
      signLedger().finally(() => setIsSigning(false))
    }
  }, [signLedger, isSigning, error, isReady, autoSend, isSigned])

  const handleSendClick = useCallback(() => {
    setAutoSend(true)
  }, [])

  const handleCancelClick = useCallback(() => {
    onReject()
  }, [onReject])

  return (
    <div className={classNames("flex w-full flex-col gap-6", className)}>
      {!error && (
        <>
          {isReady && !autoSend ? (
            <Button className="w-full" primary onClick={handleSendClick}>
              Approve on Ledger
            </Button>
          ) : (
            !isSigned && (
              <LedgerConnectionStatus {...{ ...connectionStatus }} refresh={_onRefresh} />
            )
          )}
        </>
      )}
      <Button className="w-full" onClick={handleCancelClick}>
        Cancel
      </Button>
      {error && (
        <Drawer anchor="bottom" open={true} parent={parent}>
          {/* Shouldn't be a LedgerSigningStatus, just an error message */}
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
export default LedgerEthereum
