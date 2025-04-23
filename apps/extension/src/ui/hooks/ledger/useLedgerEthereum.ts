import { stripHexPrefix } from "@ethereumjs/util"
import LedgerEthereumApp from "@ledgerhq/hw-app-eth"
import { SignTypedDataVersion, TypedDataUtils } from "@metamask/eth-sig-util"
import { isAddressEqual } from "@talismn/crypto"
import {
  AccountLedgerEthereum,
  EthSignMessageMethod,
  getTransactionSerializable,
} from "extension-core"
import { t } from "i18next"
import { useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import {
  hexToBigInt,
  isHex,
  serializeTransaction,
  Signature,
  signatureToHex,
  TransactionRequest,
} from "viem"

import { getTalismanLedgerError, TalismanLedgerError } from "./errors"
import { useLedgerTransport } from "./useLedgerTransport"

type LedgerRequest<T> = (ledger: LedgerEthereumApp) => Promise<T>

export const useLedgerEthereum = () => {
  const { t } = useTranslation()
  const refIsBusy = useRef(false)
  const { ensureTransport, closeTransport } = useLedgerTransport()

  const withLedger = useCallback(
    async <T>(request: LedgerRequest<T>): Promise<T> => {
      if (refIsBusy.current) throw new TalismanLedgerError("Busy", t("Ledger is busy"))

      refIsBusy.current = true

      try {
        const transport = await ensureTransport()
        const ledger = new LedgerEthereumApp(transport)

        return await request(ledger)
      } catch (err) {
        await closeTransport()
        throw getTalismanLedgerError(err, "Ethereum")
      } finally {
        refIsBusy.current = false
      }
    },
    [closeTransport, ensureTransport, t],
  )

  const sign = useCallback(
    (
      chainId: number,
      method: EthSignMessageMethod | "eth_sendTransaction",
      payload: unknown,
      account: AccountLedgerEthereum,
    ) => {
      return withLedger((ledger) => signWithLedger(ledger, chainId, method, payload, account))
    },
    [withLedger],
  )

  const getAddress = useCallback(
    (derivationPath: string) => {
      return withLedger((ledger) => ledger.getAddress(derivationPath, false))
    },
    [withLedger],
  )

  return {
    getAddress,
    sign,
  }
}

const signWithLedger = async (
  ledger: LedgerEthereumApp,
  chainId: number,
  method: EthSignMessageMethod | "eth_sendTransaction",
  payload: unknown,
  account: AccountLedgerEthereum,
): Promise<`0x${string}`> => {
  const { address } = await ledger.getAddress(account.derivationPath, false)
  if (!isAddressEqual(address, account.address))
    throw getTalismanLedgerError(
      t(
        "Connected Ledger device does not match the selected account. Please connect the correct device and retry.",
      ),
    )

  switch (method) {
    case "eth_signTypedData_v3":
    case "eth_signTypedData_v4": {
      const jsonMessage = typeof payload === "string" ? JSON.parse(payload) : payload

      try {
        // Nano S doesn't support signEIP712Message, fallback to signEIP712HashedMessage in case of error
        // see https://github.com/LedgerHQ/ledger-live/tree/develop/libs/ledgerjs/packages/hw-app-eth#signeip712message

        // eslint-disable-next-line no-var
        var sig = await ledger.signEIP712Message(account.derivationPath, jsonMessage)
      } catch {
        // fallback for ledger Nano S
        const { domain, types, primaryType, message } = TypedDataUtils.sanitizeData(jsonMessage)
        const domainSeparatorHex = TypedDataUtils.hashStruct(
          "EIP712Domain",
          domain,
          types,
          SignTypedDataVersion.V4,
        ).toString("hex")
        const hashStructMessageHex = TypedDataUtils.hashStruct(
          primaryType as string,
          message,
          types,
          SignTypedDataVersion.V4,
        ).toString("hex")

        sig = await ledger.signEIP712HashedMessage(
          account.derivationPath,
          domainSeparatorHex,
          hashStructMessageHex,
        )
      }

      return signatureToHex(toSignature(sig))
    }

    case "personal_sign": {
      // ensure that it is hex encoded
      const messageHex = isHex(payload) ? payload : Buffer.from(payload as string).toString("hex")

      const sig = await ledger.signPersonalMessage(
        account.derivationPath,
        stripHexPrefix(messageHex),
      )

      return signatureToHex(toSignature(sig))
    }

    case "eth_sendTransaction": {
      const txRequest = payload as TransactionRequest
      const baseTx = getTransactionSerializable(txRequest, chainId)
      const serialized = serializeTransaction(baseTx)

      const sig = await ledger.signTransaction(
        account.derivationPath,
        stripHexPrefix(serialized),
        null,
      )

      return serializeTransaction(baseTx, toSignature(sig))
    }

    default: {
      throw new Error(t("This type of message cannot be signed with ledger."))
    }
  }
}

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
