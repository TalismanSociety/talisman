import { erc20Abi } from "@core/domains/balances/rpc/abis"
import { Token } from "@core/domains/tokens/types"
import { assert } from "@polkadot/util"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { BigNumber, BigNumberish, ethers } from "ethers"

import { EthGasSettings } from "./types"

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

export const getErc20TokenId = (chainOrNetworkId: number | string, contractAddress: string) =>
  `${chainOrNetworkId}-erc20-${contractAddress}`.toLowerCase()

// BigNumbers need to be reconstructed if they are serialized then deserialized
export const rebuildTransactionRequestNumbers = (
  transaction: ethers.providers.TransactionRequest
) => {
  const tx = { ...transaction } as ethers.providers.TransactionRequest

  if (tx.gasLimit) tx.gasLimit = BigNumber.from(tx.gasLimit)
  if (tx.gasPrice) tx.gasPrice = BigNumber.from(tx.gasPrice)
  if (tx.maxFeePerGas) tx.maxFeePerGas = BigNumber.from(tx.maxFeePerGas)
  if (tx.maxPriorityFeePerGas) tx.maxPriorityFeePerGas = BigNumber.from(tx.maxPriorityFeePerGas)
  if (tx.value) tx.value = BigNumber.from(tx.value)
  if (tx.nonce) tx.nonce = BigNumber.from(tx.nonce)

  return tx
}

const TX_GAS_LIMIT_DEFAULT = BigNumber.from("250000")
const TX_GAS_LIMIT_MIN = BigNumber.from("21000")

export const getGasLimit = (
  blockGasLimit: BigNumberish,
  estimatedGas: BigNumberish,
  suggestedGasLimit?: BigNumberish
) => {
  let gasLimit = BigNumber.from(suggestedGasLimit ?? estimatedGas ?? TX_GAS_LIMIT_DEFAULT) // arbitrary default value
  if (gasLimit.gt(blockGasLimit)) {
    // probably bad formatting or error from the dapp, fallback to default value
    gasLimit = TX_GAS_LIMIT_DEFAULT
  } else if (gasLimit.lt(TX_GAS_LIMIT_MIN)) {
    // invalid, all chains use 21000 as minimum, fallback to default value
    gasLimit = TX_GAS_LIMIT_DEFAULT
  }
  return gasLimit
}

export const getTransactionFeeParams = (
  gasPrice: BigNumber,
  estimatedGas: BigNumber,
  baseFeePerGas: BigNumber,
  maxPriorityFeePerGas: BigNumber
) => {
  // if network is busy, gas can augment 12.5% per block.
  // multiplying it by 2 allows fee to be sufficient even if tx has to wait for 8 blocks
  const maxFeePerGas = baseFeePerGas.mul(2).add(maxPriorityFeePerGas)
  const gasCost = estimatedGas.mul(gasPrice)
  const maxFee = estimatedGas.mul(maxFeePerGas)
  const maxFeeAndGasCost = gasCost.add(maxFee)

  return { maxFeePerGas, gasCost, maxFee, maxFeeAndGasCost }
}

export const prepareTransaction = (
  tx: ethers.providers.TransactionRequest,
  gasSettings: EthGasSettings
) => {
  // keep only known fields except gas related ones
  const { chainId, data, from, to, value, nonce, accessList, ccipReadEnabled, customData } = tx

  const result: ethers.providers.TransactionRequest = {
    chainId,
    data,
    from,
    to,
    value,
    nonce,
    accessList,
    ccipReadEnabled,
    customData,
    // apply user gas settings
    ...gasSettings,
  }

  // ensure nonce is a number
  if (result.nonce) {
    if (BigNumber.isBigNumber(result.nonce)) {
      result.nonce = result.nonce.toNumber()
    } else if (typeof nonce === "string") {
      result.nonce = parseInt(nonce)
    }
  }

  return result
}
