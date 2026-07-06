import { mergeUint8 } from "@polkadot-api/utils"
import { isTokenOfType, parseTokenId } from "@talismn/chaindata-provider"
import { parseMetadataRpc } from "@talismn/scale"
import { Binary, Enum } from "polkadot-api"

import type { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"
import { encodePsp22Message, makeContractCaller } from "./util"

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

    const data = encodePsp22Message.transfer(to, BigInt(value))

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
      data: Binary.fromBytes(data),
    })

    const callData = mergeUint8([new Uint8Array(location), args])

    return {
      address: from,
      method: Binary.toHex(callData) as `0x${string}`,
    }
  }
