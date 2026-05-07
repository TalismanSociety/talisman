import type { IChainConnectorDot } from "@talismn/chain-connectors"

import {
  type ContractExecResult,
  decodeContractExecResult,
  encodeContractsApiCallArgs,
} from "./codec"

export const makeContractCaller =
  ({ chainConnector, chainId }: { chainConnector: IChainConnectorDot; chainId: string }) =>
  async (
    callFrom: string,
    contractAddress: string,
    inputData: Uint8Array
  ): Promise<ContractExecResult> => {
    const argsHex = encodeContractsApiCallArgs(callFrom, contractAddress, inputData)

    const response = await chainConnector.send<string>(chainId, "state_call", [
      "ContractsApi_call",
      argsHex,
    ])

    return decodeContractExecResult(response)
  }
