import i18next from "@common/i18nConfig"
import { bufferToHex, stripHexPrefix } from "@ethereumjs/util"
import { AccountJsonHardwareEthereum, getTransactionSerializable } from "@extension/core"
import { EthSignMessageMethod } from "@extension/core"
import { log } from "@extension/shared"
import LedgerEthereumApp from "@ledgerhq/hw-app-eth"
import { SignTypedDataVersion, TypedDataUtils } from "@metamask/eth-sig-util"
import { classNames } from "@talismn/util"
import { useLedgerEthereum } from "@ui/hooks/ledger/useLedgerEthereum"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Drawer } from "talisman-ui"
import { Button } from "talisman-ui"
import {
  Signature,
  TransactionRequest,
  hexToBigInt,
  isHex,
  serializeTransaction,
  signatureToHex,
} from "viem"

import {
  LedgerConnectionStatus,
  LedgerConnectionStatusProps,
} from "../Account/LedgerConnectionStatus"
import { LedgerSigningStatus } from "./LedgerSigningStatus"
import { SignApproveButton } from "./SignApproveButton"
import { SignHardwareEthereumProps } from "./SignHardwareEthereum"

const toSignature = ({ v, r, s }: { v: string | number; r: string; s: string }): Signature => {
  const parseV = (v: string | number) => {
    const parsed = typeof v === "string" ? hexToBigInt(`0x${v}`) : BigInt(v)

    // ideally this should be done in viem
    if (parsed === 0n) return 27n
    if (parsed === 1n) return 28n

    return parsed
  }

  return {
    v: parseV(v),
    r: `0x${r}`,
    s: `0x${s}`,
  }
}

const signWithLedger = async (
  ledger: LedgerEthereumApp,
  chainId: number,
  method: EthSignMessageMethod | "eth_sendTransaction",
  payload: unknown,
  accountPath: string
): Promise<`0x${string}`> => {
  switch (method) {
    case "eth_signTypedData_v3":
    case "eth_signTypedData_v4": {
      const jsonMessage = typeof payload === "string" ? JSON.parse(payload) : payload

      try {
        // Nano S doesn't support signEIP712Message, fallback to signEIP712HashedMessage in case of error
        // see https://github.com/LedgerHQ/ledger-live/tree/develop/libs/ledgerjs/packages/hw-app-eth#signeip712message

        // eslint-disable-next-line no-var
        var sig = await ledger.signEIP712Message(accountPath, jsonMessage)
      } catch {
        // fallback for ledger Nano S
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

        sig = await ledger.signEIP712HashedMessage(
          accountPath,
          domainSeparatorHex,
          hashStructMessageHex
        )
      }

      return signatureToHex(toSignature(sig))
    }

    case "personal_sign": {
      // ensure that it is hex encoded
      const messageHex = isHex(payload)
        ? payload
        : bufferToHex(Buffer.from(payload as string, "utf8"))

      const sig = await ledger.signPersonalMessage(accountPath, stripHexPrefix(messageHex))

      return signatureToHex(toSignature(sig))
    }

    case "eth_sendTransaction": {
      const txRequest = payload as TransactionRequest
      const baseTx = getTransactionSerializable(txRequest, chainId)
      const serialized = serializeTransaction(baseTx)

      const sig = await ledger.signTransaction(accountPath, stripHexPrefix(serialized), null)

      return serializeTransaction(baseTx, toSignature(sig))
    }

    default: {
      throw new Error(i18next.t("This type of message cannot be signed with ledger."))
    }
  }
}

const ErrorDrawer: FC<{ error: string | null; containerId?: string; onClose: () => void }> = ({
  error,
  containerId,
  onClose,
}) => {
  // save error so the content doesn't disappear before the drawer closing animation
  const [savedError, setSavedError] = useState<string | null>()

  useEffect(() => {
    if (error) setSavedError(error)
  }, [error])

  return (
    <Drawer anchor="bottom" isOpen={!!error && !!savedError} containerId={containerId}>
      <LedgerSigningStatus message={savedError ?? ""} status={"error"} confirm={onClose} />
    </Drawer>
  )
}

const SignLedgerEthereum: FC<SignHardwareEthereumProps> = ({
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
  const { t } = useTranslation("request")
  const [isSigning, setIsSigning] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { ledger, refresh, status, message, isReady, requiresManualRetry } = useLedgerEthereum()

  const inputsReady = useMemo(
    () => !!payload && (method !== "eth_sendTransaction" || !!evmNetworkId),
    [evmNetworkId, method, payload]
  )

  // reset
  useEffect(() => {
    setIsSigned(false)
  }, [method, payload])

  const connectionStatus: LedgerConnectionStatusProps = useMemo(
    () => ({
      status: status === "ready" ? "connecting" : status,
      message: status === "ready" ? t("Please approve from your Ledger.") : message,
      refresh,
      requiresManualRetry,
    }),
    [refresh, status, message, requiresManualRetry, t]
  )

  const _onRefresh = useCallback(() => {
    refresh()
    setError(null)
  }, [refresh, setError])

  const signLedger = useCallback(async () => {
    if (!ledger || !onSigned || !inputsReady) return

    setError(null)
    try {
      const signature = await signWithLedger(
        ledger,
        Number(evmNetworkId),
        method,
        payload,
        (account as AccountJsonHardwareEthereum).path
      )
      setIsSigned(true)

      // await so we can keep the spinning loader until popup closes
      await onSigned({ signature })
    } catch (err) {
      const error = err as Error & { statusCode?: number; reason?: string }
      // if user rejects from device
      if (error.statusCode === 27013) {
        onSentToDevice?.(false)
        return
      }

      log.error("ledger sign Ethereum", { error })

      // ETH ledger app requires EIP-1559 type 2 transactions
      if (error.reason === "invalid object key - maxPriorityFeePerGas")
        setError(
          t("Sorry, Talisman doesn't support signing transactions with Ledger on this network.")
        )
      else setError(error.reason ?? error.message)
    }
  }, [ledger, onSigned, inputsReady, evmNetworkId, method, payload, account, t, onSentToDevice])

  const handleSendClick = useCallback(() => {
    setIsSigning(true)
    onSentToDevice?.(true)
    signLedger()
      .catch(() => onSentToDevice?.(false))
      .finally(() => setIsSigning(false))
  }, [onSentToDevice, signLedger])

  const handleClearErrorClick = useCallback(() => {
    onSentToDevice?.(false)
    setError(null)
  }, [onSentToDevice])

  return (
    <div className={classNames("flex w-full flex-col gap-6", className)}>
      {!error && (
        <>
          {isReady ? (
            <SignApproveButton
              className="w-full"
              disabled={!inputsReady}
              primary
              processing={isSigning}
              onClick={handleSendClick}
            >
              {t("Approve on Ledger")}
            </SignApproveButton>
          ) : (
            !isSigned && (
              <LedgerConnectionStatus {...{ ...connectionStatus }} refresh={_onRefresh} />
            )
          )}
        </>
      )}
      {onCancel && (
        <Button className="w-full" onClick={onCancel}>
          {t("Cancel")}
        </Button>
      )}
      <ErrorDrawer error={error} containerId={containerId} onClose={handleClearErrorClick} />
    </div>
  )
}

// default export to allow for lazy loading
export default SignLedgerEthereum
