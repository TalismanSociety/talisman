import { db } from "@core/db"
import { UnsignedTransaction, ethers } from "ethers"

export const addEvmTransaction = async (
  tx: ethers.providers.TransactionRequest,
  hash: string,
  siteUrl?: string
) => {
  try {
    if (!tx.chainId || !tx.nonce || !tx.from) throw new Error("Invalid transaction")

    // serialize big numbers
    const unsigned: ethers.providers.TransactionRequest = {
      ...tx,
      gasLimit: ethers.BigNumber.isBigNumber(tx.gasLimit) ? tx.gasLimit?.toString() : tx.gasLimit,
      gasPrice: ethers.BigNumber.isBigNumber(tx.gasPrice) ? tx.gasPrice?.toString() : tx.gasPrice,
      maxFeePerGas: ethers.BigNumber.isBigNumber(tx.maxFeePerGas)
        ? tx.maxFeePerGas?.toString()
        : tx.maxFeePerGas,
      maxPriorityFeePerGas: ethers.BigNumber.isBigNumber(tx.maxPriorityFeePerGas)
        ? tx.maxPriorityFeePerGas?.toString()
        : tx.maxPriorityFeePerGas,
      value: ethers.BigNumber.isBigNumber(tx.value) ? tx.value?.toString() : tx.value,
      nonce: ethers.BigNumber.isBigNumber(tx.nonce) ? tx.nonce?.toString() : tx.nonce,
    }

    // hi
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
