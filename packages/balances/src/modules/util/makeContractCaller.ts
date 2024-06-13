import { TypeRegistry } from "@polkadot/types"
import { u8aConcatStrict, u8aToHex } from "@polkadot/util"
import { ChainConnector } from "@talismn/chain-connector"

export const makeContractCaller =
  ({
    chainConnector,
    chainId,
    registry,
  }: {
    chainConnector: ChainConnector
    chainId: string
    registry: TypeRegistry
  }) =>
  async <T extends Uint8Array | { toU8a: () => Uint8Array }>(
    callFrom: string,
    contractAddress: string,
    inputData: T
  ) =>
    registry.createType(
      "ContractExecResult",
      await chainConnector.send(chainId, "state_call", [
        "ContractsApi_call",
        u8aToHex(
          u8aConcatStrict([
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
          ])
        ),
      ])
    )
