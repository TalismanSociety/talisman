import { db } from "@core/db"
import { BigNumber, BigNumberish, ethers } from "ethers"
import merge from "lodash/merge"

import { serializeTransactionRequestBigNumbers } from "../ethereum/helpers"
import { TransactionStatus, WalletTransaction } from "./types"

const safeBigNumberish = (value?: BigNumberish) =>
  BigNumber.isBigNumber(value) ? value.toString() : value

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

export const updateEvmTransactionStatus = async (hash: string, status: TransactionStatus) => {
  try {
    await db.transactions.update(hash, { status })
    if (["success", "error"].includes(status)) {
      const tx = await db.transactions.get(hash)

      if (tx?.networkType === "evm")
        await db.transactions
          .filter((row) => row.nonce === tx.nonce && ["pending", "unknown"].includes(row.status))
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
    // TODO for all pending ones, issue a get_nonce and nuke the matches ?

    await db.transactions.filter((tx) => tx.status === "pending").modify({ status: "unknown" })
    return true
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("updateTransactionsRestart", { err })
    return false
  }
}
