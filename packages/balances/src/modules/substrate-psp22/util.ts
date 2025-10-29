import type { TypeRegistry } from "@polkadot/types"
import type { ContractExecResult } from "@polkadot/types/interfaces"
import { mergeUint8, toHex } from "@polkadot-api/utils"
import { IChainConnectorDot } from "@talismn/chain-connectors"

export const makeContractCaller =
  ({
    chainConnector,
    chainId,
    registry,
  }: {
    chainConnector: IChainConnectorDot
    chainId: string
    registry: TypeRegistry
  }) =>
  async <T extends Uint8Array | { toU8a: () => Uint8Array }>(
    callFrom: string,
    contractAddress: string,
    inputData: T,
  ) =>
    registry.createType(
      "ContractExecResult",
      await chainConnector.send(chainId, "state_call", [
        "ContractsApi_call",
        toHex(
          mergeUint8([
            // origin
            registry.createType("AccountId", callFrom).toU8a(),
            // dest
            registry.createType("AccountId", contractAddress).toU8a(),
            // value
            registry.createType("Balance", 0).toU8a(),
            // gasLimit
            registry.createType("Option<WeightV2>").toU8a(),
            // storageDepositLimit
            registry.createType("Option<Balance>").toU8a(),
            // inputData
            inputData instanceof Uint8Array ? inputData : inputData.toU8a(),
          ]),
        ),
      ]),
    ) as ContractExecResult
