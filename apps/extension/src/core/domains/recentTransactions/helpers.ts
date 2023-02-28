import { db } from "@core/db"
import { ethers } from "ethers"

export const addEvmTransaction = async (
  tx: ethers.providers.TransactionRequest,
  hash: string,
  siteUrl?: string
) => {
  try {
    // hi
    // db.transactions.add({
    //   networkType: "evm",
    //   networkId: tx.chainId,
    //   nonce: tx.nonce,
    //   account: tx.from,
    //   status: "pending",
    //   siteUrl,
    //   label: "Transaction", // TODO
    //   hash,
    //   timestamp: Date.now(),
    // })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("addEvmTransaction", { err })
  }
}
