import { mergeUint8 } from "@polkadot-api/utils"
import { Abi } from "@polkadot/api-contract"
import { TypeRegistry } from "@polkadot/types"
import { isTokenOfType, parseTokenId } from "@talismn/chaindata-provider"
import { parseMetadataRpc } from "@talismn/scale"
import { Binary, Enum } from "polkadot-api"

import { IBalanceModule } from "../../types/IBalanceModule"
import psp22Abi from "../abis/psp22.json"
import { MODULE_TYPE } from "./config"
import { makeContractCaller } from "./util"

export const getTransferCallData: IBalanceModule<
  typeof MODULE_TYPE
>["getTransferCallData"] = async ({ from, to, value, token, metadataRpc, connector }) => {
  if (!isTokenOfType(token, MODULE_TYPE))
    throw new Error(`Token type ${token.type} is not ${MODULE_TYPE}.`)

  const networkId = parseTokenId(token.id).networkId
  const { builder } = parseMetadataRpc(metadataRpc)
  const { codec, location } = builder.buildCall("Contracts", "call")

  const Psp22Abi = new Abi(psp22Abi)
  const registry = new TypeRegistry()
  const contractCall = makeContractCaller({
    chainConnector: connector,
    chainId: networkId,
    registry,
  })

  // TODO use papi contract api
  const data = Psp22Abi.findMessage("PSP22::transfer").toU8a([to, value, undefined])
  const hexData = registry.createType("Vec<u8>", data).toHex()

  const dryRunResult = await contractCall(from, token.contractAddress, data)

  const args = codec.enc({
    dest: Enum("Id", token.contractAddress),
    value: 0,
    gas_limit: {
      ref_time: dryRunResult.gasRequired.refTime.toBigInt(),
      proof_size: dryRunResult.gasRequired.proofSize.toBigInt(),
    },
    storage_deposit_limit: dryRunResult.storageDeposit.isCharge
      ? dryRunResult.storageDeposit.asCharge.toBigInt()
      : null,
    data: Binary.fromHex(hexData),
  })

  const callData = Binary.fromBytes(mergeUint8([new Uint8Array(location), args]))

  return {
    address: from,
    method: callData.asHex() as `0x${string}`,
  }
}
