import { TypeRegistry } from "@polkadot/types"
import { HexString } from "@polkadot/util/types"
import { SignerPayloadJSON } from "@substrate/txwrapper-core"
import { Address } from "@talismn/balances"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/util"
import { log } from "extension-shared"
import merge from "lodash/merge"
import { Hex, TransactionRequest } from "viem"

import { db } from "../../db"
import { TransactionStatus, WalletTransaction } from "./types"

type AddTransactionOptions = {
  label?: string
  siteUrl?: string
  tokenId?: string
  value?: string
  to?: Address
}

const DEFAULT_OPTIONS: AddTransactionOptions = {
  label: "Transaction",
}

export const addEvmTransaction = async (
  evmNetworkId: EvmNetworkId,
  hash: Hex,
  unsigned: TransactionRequest<string>,
  options: AddTransactionOptions = {},
) => {
  const { siteUrl, label, tokenId, value, to } = merge(structuredClone(DEFAULT_OPTIONS), options)

  try {
    if (!evmNetworkId || !unsigned.from || unsigned.nonce === undefined)
      throw new Error("Invalid transaction")

    const isReplacement =
      (await db.transactions
        .filter(
          (row) =>
            row.networkType === "evm" &&
            row.evmNetworkId === evmNetworkId &&
            row.nonce === unsigned.nonce,
        )
        .count()) > 0

    await db.transactions.add({
      hash,
      networkType: "evm",
      evmNetworkId,
      account: unsigned.from,
      nonce: unsigned.nonce,
      isReplacement,
      unsigned,
      status: "pending",
      siteUrl,
      label,
      tokenId,
      value,
      to,
      timestamp: Date.now(),
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("addEvmTransaction", { err })
    log.error("addEvmTransaction", { err, hash, unsigned, options })
  }
}

export const addSubstrateTransaction = async (
  hash: string,
  payload: SignerPayloadJSON,
  options: AddTransactionOptions = {},
) => {
  const { siteUrl, label, tokenId, value, to } = merge(structuredClone(DEFAULT_OPTIONS), options)

  try {
    if (!payload.genesisHash || !payload.nonce || !payload.address)
      throw new Error("Invalid transaction")

    await db.transactions.add({
      hash,
      networkType: "substrate",
      genesisHash: payload.genesisHash,
      account: payload.address,

      nonce: Number(payload.nonce),
      unsigned: payload,
      status: "pending",
      siteUrl,
      label,
      tokenId,
      value,
      to,
      timestamp: Date.now(),
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("addSubstrateTransaction", { err })
    log.error("addSubstrateTransaction", { err, hash, payload, options })
  }
}

export const filterIsSameNetworkAndAddressTx =
  (ref: WalletTransaction) => (tx: WalletTransaction) => {
    if (normalizeAddress(ref.account) !== normalizeAddress(tx.account)) return false
    if (ref.networkType !== tx.networkType) return false
    if (
      ref.networkType === "evm" &&
      tx.networkType === "evm" &&
      ref.evmNetworkId === tx.evmNetworkId
    )
      return true
    if (
      ref.networkType === "substrate" &&
      tx.networkType === "substrate" &&
      ref.genesisHash === tx.genesisHash
    )
      return true
    return false
  }

export const updateTransactionStatus = async (
  hash: string,
  status: TransactionStatus,
  blockNumber?: bigint | number,
  confirmed?: boolean,
) => {
  try {
    // this can be called after the tx has been overriden/replaced, check status first
    const existing = await db.transactions.get(hash)
    if (
      ["success", "error", "replaced"].includes(existing?.status ?? "") &&
      !!confirmed === !!existing?.confirmed
    )
      return false

    await db.transactions.update(hash, { status, blockNumber: blockNumber?.toString(), confirmed })

    if (["success", "error"].includes(status)) {
      const tx = await db.transactions.get(hash)

      if (tx) {
        // mark pending transactions with the same nonce as replaced
        await db.transactions
          .filter(filterIsSameNetworkAndAddressTx(tx))
          .filter((row) => row.nonce === tx.nonce && ["pending", "unknown"].includes(row.status))
          .modify({ status: "replaced" })

        // mark pending transactions with a lower nonce as unknown
        await db.transactions
          .filter(filterIsSameNetworkAndAddressTx(tx))
          .filter((row) => row.nonce < tx.nonce && row.status === "pending")
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
  const tx = await db.transactions.get(hash)
  return tx?.status ?? "unknown"
}

export const updateTransactionsRestart = async () => {
  try {
    // for all successful tx, mark the pending ones with the same nonce as failed
    for (const successfulTx of await db.transactions.where("status").equals("success").toArray()) {
      await db.transactions
        .filter(filterIsSameNetworkAndAddressTx(successfulTx))
        .filter(
          (row) => row.nonce === successfulTx.nonce && ["pending", "unknown"].includes(row.status),
        )
        .modify({ status: "error" })
    }

    // mark all other pending transactions as unknown
    await db.transactions.where("status").equals("pending").modify({ status: "unknown" })

    // keep only the last 100 transactions
    const deleted = await db.transactions.orderBy("timestamp").reverse().offset(100).delete()
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

export const dismissTransaction = (hash: string) => db.transactions.delete(hash)
