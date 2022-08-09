import { erc20Abi } from "@core/domains/balances/rpc/abis"
import { Token } from "@core/domains/tokens/types"
import { assert } from "@polkadot/util"
import { ethers } from "ethers"

export const getEthDerivationPath = (index = 0) => `/m/44'/60'/0'/0/${index}`

export const getEthTransferTransactionBase = async (
  token: Token,
  planck: string,
  toAddress: string
): Promise<ethers.providers.TransactionRequest> => {
  assert(token, "token is required")
  assert(planck, "planck is required")
  assert(toAddress, "toAddress is required")

  if (token.type === "native") {
    return {
      value: ethers.BigNumber.from(planck),
      to: ethers.utils.getAddress(toAddress),
    }
  } else if (token.type === "erc20") {
    const contract = new ethers.Contract(token.contractAddress, erc20Abi)
    return await contract.populateTransaction["transfer"](toAddress, ethers.BigNumber.from(planck))
  } else throw new Error(`Invalid token type ${token.type} - token ${token.id}`)
}
