// TODO delete this file after ethers => viem migration

// import { log } from "@core/log"
// import { BigNumber, ethers } from "ethers"
// import { accessListify } from "ethers/lib/utils"
// import {
//   AccessList,
//   RpcTransactionRequest,
//   TransactionRequest,
//   hexToBigInt,
//   hexToNumber,
//   isHex,
// } from "viem"
// // import { RecursiveArray } from "viem/_types/utils/encoding/toRlp"
// // import { parseAccessList } from "viem/_types/utils/transaction/parseTransaction"

// // import { EthGasSettings } from "./types"

// // type ViemGasSettings =
// //   | {
// //       type: "legacy"
// //       gas?: bigint
// //       gasPrice?: bigint
// //     }
// //   | {
// //       type: "eip1559"
// //       gas?: bigint
// //       maxFeePerGas?: bigint
// //       maxPriorityFeePerGas?: bigint
// //     }

// // export const ethGasSettingsToViemGasSettings = (settings: EthGasSettings): ViemGasSettings => {
// //   return settings.type === 2
// //     ? ({
// //         type: "eip1559",
// //         gas: settings.gasLimit ? BigNumber.from(settings.gasLimit).toBigInt() : undefined,
// //         maxFeePerGas: settings.maxFeePerGas
// //           ? BigNumber.from(settings.maxFeePerGas).toBigInt()
// //           : undefined,
// //         maxPriorityFeePerGas: settings.maxPriorityFeePerGas
// //           ? BigNumber.from(settings.maxPriorityFeePerGas).toBigInt()
// //           : undefined,
// //       } as const)
// //     : ({
// //         type: "legacy",
// //         gas: settings.gasLimit ? BigNumber.from(settings.gasLimit).toBigInt() : undefined,
// //         gasPrice: settings.gasPrice ? BigNumber.from(settings.gasPrice).toBigInt() : undefined,
// //       } as const)
// // }

// export const getViemGasSettings = (tx: ethers.providers.TransactionRequest) => {
//   return tx.type === 2
//     ? ({
//         type: "eip1559",
//         gas: tx.gasLimit ? BigNumber.from(tx.gasLimit).toBigInt() : undefined,
//         maxFeePerGas: tx.maxFeePerGas ? BigNumber.from(tx.maxFeePerGas).toBigInt() : undefined,
//         maxPriorityFeePerGas: tx.maxPriorityFeePerGas
//           ? BigNumber.from(tx.maxPriorityFeePerGas).toBigInt()
//           : undefined,
//         accessList: tx.accessList ? (accessListify(tx.accessList) as AccessList) : undefined,
//       } as const)
//     : ({
//         type: "legacy" as const,
//         gas: tx.gasLimit ? BigNumber.from(tx.gasLimit).toBigInt() : undefined,
//         gasPrice: tx.gasPrice ? BigNumber.from(tx.gasPrice).toBigInt() : undefined,
//       } as const)
// }

// export const getViemSendTransactionParams = (ethersTx: ethers.providers.TransactionRequest) => {
//   const viemTx = {
//     to: ethersTx.to ? (ethersTx.to as `0x${string}`) : undefined,
//     data: ethersTx.data ? (ethersTx.data as `0x${string}`) : undefined,
//     value: ethersTx.value !== undefined ? BigNumber.from(ethersTx.value).toBigInt() : undefined,
//     nonce: ethersTx.nonce !== undefined ? BigNumber.from(ethersTx.nonce).toNumber() : undefined,
//     ...getViemGasSettings(ethersTx),
//   }

//   log.log("getViemSendTransactionParams", { ethersTx, viemTx })
//   return viemTx
// }

// export const parseTransactionRequest = (rtx: RpcTransactionRequest): TransactionRequest => {
//   switch (rtx.type) {
//     case "0x0": {
//       const tx: TransactionRequest = {
//         type: "legacy",
//         from: rtx.from,
//       }
//       if (isHex(rtx.to)) tx.to = rtx.to
//       if (isHex(rtx.data)) tx.data = rtx.data
//       if (isHex(rtx.value)) tx.value = hexToBigInt(rtx.value)
//       if (isHex(rtx.nonce)) tx.nonce = hexToNumber(rtx.nonce)
//       if (isHex(rtx.gas)) tx.gas = hexToBigInt(rtx.gas)
//       if (isHex(rtx.gasPrice)) tx.gasPrice = hexToBigInt(rtx.gasPrice)
//       return tx
//     }
//     case "0x1": {
//       const tx: TransactionRequest = {
//         type: "eip2930",
//         from: rtx.from,
//       }
//       if (isHex(rtx.to)) tx.to = rtx.to
//       if (isHex(rtx.data)) tx.data = rtx.data
//       if (isHex(rtx.value)) tx.value = hexToBigInt(rtx.value)
//       if (isHex(rtx.nonce)) tx.nonce = hexToNumber(rtx.nonce)
//       if (isHex(rtx.gas)) tx.gas = hexToBigInt(rtx.gas)
//       if (isHex(rtx.gasPrice)) tx.gasPrice = hexToBigInt(rtx.gasPrice)
//       if (rtx.accessList) tx.accessList = rtx.accessList
//       return tx
//     }
//     case "0x2": {
//       const tx: TransactionRequest = {
//         type: "eip1559",
//         from: rtx.from,
//       }
//       if (isHex(rtx.to)) tx.to = rtx.to
//       if (isHex(rtx.data)) tx.data = rtx.data
//       if (isHex(rtx.value)) tx.value = hexToBigInt(rtx.value)
//       if (isHex(rtx.nonce)) tx.nonce = hexToNumber(rtx.nonce)
//       if (isHex(rtx.gas)) tx.gas = hexToBigInt(rtx.gas)
//       if (isHex(rtx.maxFeePerGas)) tx.maxFeePerGas = hexToBigInt(rtx.maxFeePerGas)
//       if (isHex(rtx.maxPriorityFeePerGas))
//         tx.maxPriorityFeePerGas = hexToBigInt(rtx.maxPriorityFeePerGas)
//       if (rtx.accessList) tx.accessList = rtx.accessList
//       return tx
//     }
//   }

//   if (rtx.gasPrice && rtx.accessList) return parseTransactionRequest({ type: "0x1", ...rtx })
//   if (rtx.gasPrice) return parseTransactionRequest({ type: "0x0", ...rtx } as RpcTransactionRequest)
//   return parseTransactionRequest({ type: "0x2", ...rtx } as RpcTransactionRequest)
// }

export default 0
