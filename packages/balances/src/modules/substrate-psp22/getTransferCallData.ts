import { mergeUint8 } from "@polkadot-api/utils"
import { isTokenOfType, parseTokenId } from "@talismn/chaindata-provider"
import { parseMetadataRpc } from "@talismn/scale"
import { Binary, Enum } from "polkadot-api"

import type { IBalanceModule } from "../../types/IBalanceModule"
import { encodePsp22Message, encodeVecU8Hex } from "./codec"
import { MODULE_TYPE } from "./config"
import { makeContractCaller } from "./util"

export const getTransferCallData: IBalanceModule<typeof MODULE_TYPE>["getTransferCallData"] =
  async ({ from, to, value, token, metadataRpc, connector }) => {
    if (!isTokenOfType(token, MODULE_TYPE))
      throw new Error(`Token type ${token.type} is not ${MODULE_TYPE}.`)

    const networkId = parseTokenId(token.id).networkId
    const { builder } = parseMetadataRpc(metadataRpc)
    const { codec, location } = builder.buildCall("Contracts", "call")

    const contractCall = makeContractCaller({
      chainConnector: connector,
      chainId: networkId,
    })

    const data = encodePsp22Message("PSP22::transfer", [to, BigInt(value), undefined])
    const hexData = encodeVecU8Hex(data)

    const dryRunResult = await contractCall(from, token.contractAddress, data)

    const args = codec.enc({
      dest: Enum("Id", token.contractAddress),
      value: 0,
      gas_limit: {
        ref_time: dryRunResult.gasRequired.refTime,
        proof_size: dryRunResult.gasRequired.proofSize,
      },
      storage_deposit_limit:
        dryRunResult.storageDeposit.tag === "Charge" ? dryRunResult.storageDeposit.value : null,
      data: Binary.fromHex(hexData),
    })

    const callData = Binary.fromBytes(mergeUint8([new Uint8Array(location), args]))

    return {
      address: from,
      method: callData.asHex() as `0x${string}`,
    }
  }
