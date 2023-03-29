import { db } from "@core/db"
import { TypeRegistry } from "@polkadot/types"
import { HexString } from "@polkadot/util/types"
import { SignerPayloadJSON } from "@substrate/txwrapper-core"
import { ethers } from "ethers"
import merge from "lodash/merge"

import { serializeTransactionRequestBigNumbers } from "../ethereum/helpers"
import { TransactionStatus } from "./types"

type AddEvemTransactionOptions = {
  label?: string
  siteUrl?: string
}

const DEFAULT_OPTIONS: AddEvemTransactionOptions = {
  label: "Transaction",
}

export const addEvmTransaction = async (
  hash: string,
  tx: ethers.providers.TransactionRequest,
  options: AddEvemTransactionOptions = {}
) => {
  const { siteUrl, label } = merge(structuredClone(DEFAULT_OPTIONS), options)

  try {
    if (!tx.chainId || !tx.nonce || !tx.from) throw new Error("Invalid transaction")

    // make it serializable so it can be safely stored
    const unsigned = serializeTransactionRequestBigNumbers(tx)

    db.transactions.add({
      networkType: "evm",
      evmNetworkId: String(tx.chainId),
      nonce: ethers.BigNumber.from(tx.nonce).toNumber(),
      account: tx.from,
      status: "pending",
      siteUrl,
      label: "Transaction", // TODO
      hash,
      timestamp: Date.now(),
      unsigned,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("addEvmTransaction", { err })
  }
}

export const addSubstrateTransaction = async (
  hash: string,
  payload: SignerPayloadJSON,
  options: AddEvemTransactionOptions = {}
) => {
  const { siteUrl, label } = merge(structuredClone(DEFAULT_OPTIONS), options)

  try {
    if (!payload.genesisHash || !payload.nonce || !payload.address)
      throw new Error("Invalid transaction")

    db.transactions.add({
      hash,
      networkType: "substrate",
      account: payload.address,
      genesisHash: payload.genesisHash,
      nonce: Number(payload.nonce),
      unsigned: payload,
      status: "pending",
      siteUrl,
      label,
      timestamp: Date.now(),
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("addSubstrateTransaction", { err })
  }
}

export const updateTransactionStatus = async (
  hash: string,
  status: TransactionStatus,
  blockNumber?: number
) => {
  try {
    await db.transactions.update(hash, { status, blockNumber })

    if (["success", "error"].includes(status)) {
      const tx = await db.transactions.get(hash)

      // mark pending transactions with the same nonce as replaced
      if (tx)
        await db.transactions
          .filter(
            (row) =>
              ((tx.networkType === "evm" &&
                row.networkType === "evm" &&
                row.evmNetworkId === tx.evmNetworkId) ||
                (tx.networkType === "substrate" &&
                  row.networkType === "substrate" &&
                  row.genesisHash === tx.genesisHash)) &&
              row.nonce === tx.nonce &&
              ["pending", "unknown"].includes(row.status)
          )
          .modify({ status: "replaced" })
    }

    return true
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("updateEvmTransaction", { err })
    return false
  }
}

export const updateTransactionsRestart = async () => {
  try {
    await db.transactions.filter((tx) => tx.status === "pending").modify({ status: "unknown" })
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
  signature: HexString
) => {
  const tx = registry.createType(
    "Extrinsic",
    { method: payload.method },
    { version: payload.version }
  )
  tx.addSignature(payload.address, signature, payload)
  return tx.hash.toHex()
}
