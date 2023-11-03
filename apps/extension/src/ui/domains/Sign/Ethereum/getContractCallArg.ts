import { DecodedEvmTransaction } from "@core/util/getEthTransactionInfo"
import { ethers } from "ethers"
import { getAbiItem } from "viem"

/** @deprecated */
export const getContractCallArgOld = <T>(
  contractCall: ethers.utils.TransactionDescription,
  argName: string
): T | undefined => {
  const paramIndex = contractCall.functionFragment.inputs.findIndex((arg) => arg.name === argName)
  return contractCall.args[paramIndex] as T
}

export const getContractCallArg = <TResult>(
  decodedTx: DecodedEvmTransaction,
  argName: string
): TResult => {
  if (!decodedTx.contractCall || !decodedTx.abi) throw new Error("Missing contract call or abi")

  const methodDef = getAbiItem({
    abi: decodedTx.abi,
    args: decodedTx.contractCall.args,
    name: decodedTx.contractCall.functionName,
  })

  const argIndex = methodDef.inputs.findIndex((input) => input.name === argName)
  return decodedTx.contractCall.args?.[argIndex] as TResult
}
