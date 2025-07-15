import {
  Abi,
  Client,
  ContractFunctionExecutionError,
  erc20Abi,
  erc20Abi_bytes32,
  getContract,
  hexToString,
} from "viem"

import { uniswapV2PairAbi } from "../abis"

export const getErc20ContractData = async (
  client: Client,
  contractAddress: `0x${string}`,
): Promise<{ symbol: string; decimals: number; name: string }> => {
  try {
    const contract = getTypedContract(client, erc20Abi, contractAddress)

    // eslint-disable-next-line no-var
    var [symbol, decimals, name] = await Promise.all([
      contract.read.symbol(),
      contract.read.decimals(),
      contract.read.name(),
    ])
  } catch (e) {
    if (e instanceof ContractFunctionExecutionError) {
      // try to perform the contract read with bytes32 symbol
      const contract = getTypedContract(client, erc20Abi_bytes32, contractAddress)

      // eslint-disable-next-line no-var
      var [bytesSymbol, decimals, nameSymbol] = await Promise.all([
        contract.read.symbol(),
        contract.read.decimals(),
        contract.read.name(),
      ])
      symbol = hexToString(bytesSymbol).replace(/\0/g, "").trim() // remove NULL characters
      name = hexToString(nameSymbol).replace(/\0/g, "").trim() // remove NULL characters
    } else throw e
  }

  return { symbol, decimals, name }
}

const getTypedContract = <TAbi extends Abi>(
  client: Client,
  abi: TAbi,
  contractAddress: `0x${string}`,
) =>
  getContract({
    address: contractAddress,
    abi,
    client: { public: client },
  })

export const getUniswapV2PairContractData = async (
  client: Client,
  contractAddress: `0x${string}`,
) => {
  const contract = getTypedContract(client, uniswapV2PairAbi, contractAddress)

  // eslint-disable-next-line no-var
  var [token0, token1, decimals, name] = await Promise.all([
    contract.read.token0(),
    contract.read.token1(),
    contract.read.decimals(),
    contract.read.name(),
  ])

  return { token0, token1, decimals, name }
}
