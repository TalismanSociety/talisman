import { DecodedEvmTransaction } from "@ui/domains/Ethereum/util/decodeEvmTransaction"
import { getAbiItem } from "viem"

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const argIndex = methodDef.inputs.findIndex((input: any) => input.name === argName)
  return decodedTx.contractCall.args?.[argIndex] as TResult
}
