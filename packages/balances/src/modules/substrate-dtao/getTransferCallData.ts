import { mergeUint8 } from "@polkadot-api/utils"
import { isTokenOfType, parseSubDTaoTokenId } from "@talismn/chaindata-provider"
import { parseMetadataRpc } from "@talismn/scale"
import { Binary } from "polkadot-api"

import { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"

export const getTransferCallData: IBalanceModule<typeof MODULE_TYPE>["getTransferCallData"] = ({
  from,
  to,
  value,
  token,
  metadataRpc,
}) => {
  if (!isTokenOfType(token, MODULE_TYPE))
    throw new Error(`Token type ${token.type} is not ${MODULE_TYPE}.`)

  const { netuid: subnetId, hotkey } = parseSubDTaoTokenId(token.id)
  if (!hotkey) throw new Error(`Missing hotkey`)

  const { builder } = parseMetadataRpc(metadataRpc)
  const { codec, location } = builder.buildCall("SubtensorModule", "transfer_stake")

  const args = codec.enc({
    origin_netuid: subnetId,
    hotkey,
    destination_coldkey: to,
    destination_netuid: subnetId,
    alpha_amount: value,
  })

  const callData = Binary.fromBytes(mergeUint8([new Uint8Array(location), args]))

  return {
    address: from,
    method: callData.asHex() as `0x${string}`,
  }
}
