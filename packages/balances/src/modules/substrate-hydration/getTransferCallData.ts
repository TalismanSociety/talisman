import { mergeUint8 } from "@polkadot-api/utils"
import { isTokenOfType } from "@talismn/chaindata-provider"
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

  // there is only one transfer method, no existential deposit handling.
  // => leave this to the frontend and dry runs
  const { builder } = parseMetadataRpc(metadataRpc)
  const { codec, location } = builder.buildCall("Currencies", "transfer")
  const args = {
    dest: to,
    currency_id: token.onChainId,
    amount: BigInt(value),
  }

  const callData = Binary.fromBytes(mergeUint8([new Uint8Array(location), codec.enc(args)]))
  return {
    address: from,
    method: callData.asHex() as `0x${string}`,
  }
}
