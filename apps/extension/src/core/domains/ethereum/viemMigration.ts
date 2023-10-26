// TODO delete this file after ethers => viem migration

import { log } from "@core/log"
import { BigNumber, ethers } from "ethers"
import { accessListify } from "ethers/lib/utils"
import { AccessList } from "viem"

export const getViemGasSettings = (tx: ethers.providers.TransactionRequest) => {
  return tx.type === 2
    ? ({
        type: "eip1559",
        gas: tx.gasLimit ? BigNumber.from(tx.gasLimit).toBigInt() : undefined,
        maxFeePerGas: tx.maxFeePerGas ? BigNumber.from(tx.maxFeePerGas).toBigInt() : undefined,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas
          ? BigNumber.from(tx.maxPriorityFeePerGas).toBigInt()
          : undefined,
        accessList: tx.accessList ? (accessListify(tx.accessList) as AccessList) : undefined,
      } as const)
    : ({
        type: "legacy" as const,
        gas: tx.gasLimit ? BigNumber.from(tx.gasLimit).toBigInt() : undefined,
        gasPrice: tx.gasPrice ? BigNumber.from(tx.gasPrice).toBigInt() : undefined,
      } as const)
}

export const getViemSendTransactionParams = (ethersTx: ethers.providers.TransactionRequest) => {
  const viemTx = {
    to: ethersTx.to ? (ethersTx.to as `0x${string}`) : undefined,
    data: ethersTx.data ? (ethersTx.data as `0x${string}`) : undefined,
    value: ethersTx.value !== undefined ? BigNumber.from(ethersTx.value).toBigInt() : undefined,
    nonce: ethersTx.nonce !== undefined ? BigNumber.from(ethersTx.nonce).toNumber() : undefined,
    ...getViemGasSettings(ethersTx),
  }

  log.log("getViemSendTransactionParams", { ethersTx, viemTx })
  return viemTx
}
