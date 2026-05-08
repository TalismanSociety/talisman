import type { TypeRegistry } from "@polkadot/types"
import type { ContractExecResult } from "@polkadot/types/interfaces"
import type { IChainConnectorDot } from "@talismn/chain-connectors"

const u8aToHex = (value: Uint8Array): `0x${string}` =>
  `0x${Array.from(value, (b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`

const u8aConcatStrict = (arrays: readonly Uint8Array[]): Uint8Array => {
  const length = arrays.reduce((total, arr) => total + arr.length, 0)
  const result = new Uint8Array(length)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

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
    inputData: T
  ) =>
    registry.createType(
      "ContractExecResult",
      await chainConnector.send(chainId, "state_call", [
        "ContractsApi_call",
        u8aToHex(
          u8aConcatStrict([
            // origin
            registry
              .createType("AccountId", callFrom)
              .toU8a(),
            // dest
            registry
              .createType("AccountId", contractAddress)
              .toU8a(),
            // value
            registry
              .createType("Balance", 0)
              .toU8a(),
            // gasLimit
            registry
              .createType("Option<WeightV2>")
              .toU8a(),
            // storageDepositLimit
            registry
              .createType("Option<Balance>")
              .toU8a(),
            // inputData
            inputData instanceof Uint8Array ? inputData : inputData.toU8a(),
          ])
        ),
      ])
    ) as ContractExecResult
