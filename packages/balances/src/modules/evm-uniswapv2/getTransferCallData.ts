import { isTokenOfType } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { encodeFunctionData, erc20Abi } from "viem"

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

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, BigInt(value)],
  })

  return { from, to: token.contractAddress, data }
}
