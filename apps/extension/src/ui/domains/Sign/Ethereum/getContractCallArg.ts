import { DecodedEvmTransaction } from "@core/util/getEthTransactionInfo"
import { ethers } from "ethers"
import { getAbiItem } from "viem"

export const getContractCallArg = <T>(
  contractCall: ethers.utils.TransactionDescription,
  argName: string
): T | undefined => {
  const paramIndex = contractCall.functionFragment.inputs.findIndex((arg) => arg.name === argName)
  return contractCall.args[paramIndex] as T
}

export const getContractCallArg2 = <TResult>(
  decodedTx: DecodedEvmTransaction,
  argName: string
): TResult | undefined => {
  if (decodedTx.contractCall && decodedTx.abi) {
    const methodDef = getAbiItem({
      abi: decodedTx.abi,
      args: decodedTx.contractCall.args,
      name: decodedTx.contractCall.functionName,
    })

    const argIndex = methodDef.inputs.findIndex((input) => input.name === argName)
    return decodedTx.contractCall.args?.[argIndex] as TResult
  }

  return undefined
}
