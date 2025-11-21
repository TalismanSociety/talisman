import { TypeRegistry } from "@polkadot/types"
import { HexString } from "@polkadot/util/types"
import { Transaction, VersionedTransaction } from "@solana/web3.js"
import { SignerPayloadJSON } from "@substrate/txwrapper-core"
import { EthNetworkId, SolNetworkId } from "@talismn/chaindata-provider"
import { parseTransactionInfo, serializeTransaction } from "@talismn/solana"
import { log } from "extension-shared"
import merge from "lodash-es/merge"
import { Hex, TransactionRequest } from "viem"

import { db } from "../../db"
import { filterIsSameNetworkAndAddressTx } from "./exports"
import { TransactionStatus, WalletTransactionInfo } from "./types"

type AddTransactionOptions = {
  label?: string
  siteUrl?: string
  txInfo?: WalletTransactionInfo
}

const DEFAULT_OPTIONS: AddTransactionOptions = {
  label: "Transaction",
}

export const addSolTransaction = async (
  networkId: SolNetworkId,
  transaction: Transaction | VersionedTransaction,
  options: AddTransactionOptions = {},
) => {
  const { siteUrl, label, txInfo } = merge(structuredClone(DEFAULT_OPTIONS), options)

  try {
    const { signature, address: account } = parseTransactionInfo(transaction)
    if (!networkId || !signature || !account) throw new Error("Invalid transaction")

    await db.transactionsV2.add({
      id: signature,
      platform: "solana",
      networkId,
      account,
      signature,
      payload: serializeTransaction(transaction),
      status: "pending",
      confirmed: false,
      siteUrl,
      label,
      txInfo,
      timestamp: Date.now(),
    })
  } catch (err) {
    log.error("addSolTransaction", { err, transaction, options })
  }
}

export const addEvmTransaction = async (
  networkId: EthNetworkId,
  hash: Hex,
  payload: TransactionRequest<string>,
  options: AddTransactionOptions = {},
) => {
  const { siteUrl, label, txInfo } = merge(structuredClone(DEFAULT_OPTIONS), options)

  try {
    if (!networkId || !payload.from || payload.nonce === undefined)
      throw new Error("Invalid transaction")

    const isReplacement =
      (await db.transactionsV2
        .filter(
          (row) =>
            row.platform === "ethereum" &&
            row.networkId === networkId &&
            row.nonce === payload.nonce,
        )
        .count()) > 0

    await db.transactionsV2.add({
      id: hash,
      hash,
      platform: "ethereum",
      networkId,
      account: payload.from,
      nonce: payload.nonce,
      isReplacement,
      payload,
      status: "pending",
      siteUrl,
      label,
      confirmed: false,
      txInfo,
      timestamp: Date.now(),
    })
  } catch (err) {
    log.error("addEvmTransaction", { err, hash, payload, options })
  }
}

export const addSubstrateTransaction = async (
  networkId: string,
  hash: `0x${string}`,
  payload: SignerPayloadJSON,
  options: AddTransactionOptions = {},
) => {
  const { siteUrl, label, txInfo } = merge(structuredClone(DEFAULT_OPTIONS), options)

  try {
    if (!payload.genesisHash || !payload.nonce || !payload.address)
      throw new Error("Invalid transaction")

    await db.transactionsV2.add({
      id: hash,
      platform: "polkadot",
      hash,
      networkId,
      account: payload.address,
      nonce: Number(payload.nonce),
      payload,
      status: "pending",
      siteUrl,
      label,
      txInfo,
      timestamp: Date.now(),
      confirmed: false,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("addSubstrateTransaction", { err })
    log.error("addSubstrateTransaction", { err, hash, payload, options })
  }
}

export const updateTransactionStatus = async (
  id: string,
  status: TransactionStatus,
  blockNumber?: bigint | number,
  confirmed?: boolean,
) => {
  try {
    // this can be called after the tx has been overriden/replaced, check status first
    const existing = await db.transactionsV2.get(id)
    if (!existing) return false
    if (
      ["success", "error", "replaced"].includes(existing?.status ?? "") &&
      !!confirmed === !!existing?.confirmed
    )
      return false

    existing.status = status
    existing.confirmed = !!confirmed

    if (existing.platform !== "solana" && blockNumber !== undefined)
      existing.blockNumber = blockNumber.toString()

    await db.transactionsV2.update(id, existing)

    if (["success", "error"].includes(status)) {
      const tx = await db.transactionsV2.get(id)

      if (tx) {
        // mark pending transactions with the same nonce as replaced
        await db.transactionsV2
          .filter(filterIsSameNetworkAndAddressTx(tx))
          .filter(
            (row) =>
              row.platform !== "solana" &&
              tx.platform !== "solana" &&
              row.nonce === tx.nonce &&
              ["pending", "unknown"].includes(row.status),
          )
          .modify({ status: "replaced" })

        // mark pending transactions with a lower nonce as unknown
        await db.transactionsV2
          .filter(filterIsSameNetworkAndAddressTx(tx))
          .filter(
            (row) =>
              row.platform !== "solana" &&
              tx.platform !== "solana" &&
              typeof row.nonce === "number" &&
              typeof tx.nonce === "number" &&
              row.nonce < tx.nonce &&
              row.status === "pending",
          )
          .modify({ status: "unknown" })
      }
    }

    return true
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("updateTransactionStatus", { err })
    return false
  }
}

export const getTransactionStatus = async (hash: string) => {
  const tx = await db.transactionsV2.get(hash)
  return tx?.status ?? "unknown"
}

export const updateTransactionsRestart = async () => {
  try {
    // for all successful tx, mark the pending ones with the same nonce as failed
    for (const successfulTx of await db.transactionsV2
      .where("status")
      .equals("success")
      .toArray()) {
      await db.transactionsV2
        .filter(filterIsSameNetworkAndAddressTx(successfulTx))
        .filter(
          (row) =>
            row.platform !== "solana" &&
            successfulTx.platform !== "solana" &&
            row.nonce === successfulTx.nonce &&
            ["pending", "unknown"].includes(row.status),
        )
        .modify({ status: "error" })
    }

    // mark all other pending transactions as unknown
    await db.transactionsV2.where("status").equals("pending").modify({ status: "unknown" })

    // keep only the last 100 transactions
    const deleted = await db.transactionsV2.orderBy("timestamp").reverse().offset(100).delete()
    if (deleted) log.debug("[updateTransactionsRestart] Deleted %d entries", deleted)

    return true
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("updateTransactionsRestart", { err })
    return false
  }
}

export const getExtrinsicHash = (
  registry: TypeRegistry,
  payload: SignerPayloadJSON,
  signature: HexString,
) => {
  const tx = registry.createType(
    "Extrinsic",
    { method: payload.method },
    { version: payload.version },
  )
  tx.addSignature(payload.address, signature, payload)
  return tx.hash.toHex()
}

export const dismissTransaction = (hash: string) => db.transactionsV2.delete(hash)

export const isTxInfoOfType = <T extends WalletTransactionInfo["type"]>(
  txInfo: WalletTransactionInfo | undefined | null,
  type: T,
): txInfo is Extract<WalletTransactionInfo, { type: T }> => {
  return !!txInfo && txInfo.type === type
}

export const isTxInfoInTypes = <T extends WalletTransactionInfo["type"]>(
  txInfo: WalletTransactionInfo | undefined | null,
  types: T[],
): txInfo is Extract<WalletTransactionInfo, { type: T }> => {
  return types.some((type) => isTxInfoOfType(txInfo, type))
}

export const isTxInfoSwap = (txInfo: WalletTransactionInfo | undefined | null) =>
  isTxInfoInTypes(txInfo, ["swap-simpleswap", "swap-stealthex", "swap-lifi"])

export const isTxInfoTransfer = (txInfo: WalletTransactionInfo | undefined | null) =>
  isTxInfoOfType(txInfo, "transfer")

export const isTxInfoApproval = (txInfo: WalletTransactionInfo | undefined | null) =>
  isTxInfoOfType(txInfo, "approve-erc20")
