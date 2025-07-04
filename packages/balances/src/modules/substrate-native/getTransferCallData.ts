import { isTokenEvmErc20 } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/util"
import { encodeFunctionData, erc20Abi } from "viem"

import { IBalanceModule } from "../IBalanceModule"

export const getTransferCallData: IBalanceModule<"evm-erc20">["getTransferCallData"] = ({
  from,
  to,
  value,
  token,
}) => {
  if (!isTokenEvmErc20(token)) throw new Error("Token is not an EVM ERC20 token")
  if (!isEthereumAddress(from)) throw new Error("Invalid from address")
  if (!isEthereumAddress(to)) throw new Error("Invalid to address")

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, BigInt(value)],
  })

  return { from, to: token.contractAddress, data }
}
