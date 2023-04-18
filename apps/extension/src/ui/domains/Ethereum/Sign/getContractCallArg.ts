import { ethers } from "ethers"

export const getContractCallArg = <T>(
  contractCall: ethers.utils.TransactionDescription,
  argName: string
): T | undefined => {
  const paramIndex = contractCall.functionFragment.inputs.findIndex((arg) => arg.name === argName)
  return contractCall.args[paramIndex] as T
}
