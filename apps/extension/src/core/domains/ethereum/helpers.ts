import { erc20Abi } from "@core/domains/balances/rpc/abis"
import { Token } from "@core/domains/tokens/types"
import { assert } from "@polkadot/util"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { ethers } from "ethers"

export const getEthDerivationPath = (index = 0) => `/m/44'/60'/0'/0/${index}`

export const getEthTransferTransactionBase = async (
  evmNetworkId: number,
  from: string,
  to: string,
  token: Token,
  planck: string
): Promise<ethers.providers.TransactionRequest> => {
  assert(evmNetworkId, "evmNetworkId is required")
  assert(token, "token is required")
  assert(planck, "planck is required")
  assert(isEthereumAddress(from), "toAddress is required")
  assert(isEthereumAddress(to), "toAddress is required")

  let tx: ethers.providers.TransactionRequest

  if (token.type === "native") {
    tx = {
      value: ethers.BigNumber.from(planck),
      to: ethers.utils.getAddress(to),
    }
  } else if (token.type === "erc20") {
    const contract = new ethers.Contract(token.contractAddress, erc20Abi)
    tx = await contract.populateTransaction["transfer"](to, ethers.BigNumber.from(planck))
  } else throw new Error(`Invalid token type ${token.type} - token ${token.id}`)

  return {
    chainId: evmNetworkId,
    from,
    ...tx,
  }
}
