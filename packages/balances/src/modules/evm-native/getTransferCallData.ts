import { isTokenOfType } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"

import { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"

export const getTransferCallData: IBalanceModule<typeof MODULE_TYPE>["getTransferCallData"] = ({
  from,
  to,
  value,
  token,
}) => {
  if (!isTokenOfType(token, MODULE_TYPE))
    throw new Error(`Token type ${token.type} is not ${MODULE_TYPE}.`)
  if (!isEthereumAddress(from)) throw new Error("Invalid from address")
  if (!isEthereumAddress(to)) throw new Error("Invalid to address")

  return { from, to, value, data: "0x" as `0x${string}` }
}
