import {
  abiErc20,
  abiErc721,
  abiErc1155,
  abiMoonConvictionVoting,
  abiMoonStaking,
  abiMoonXTokens,
  abiPermit2,
  PERMIT2_ADDRESS,
} from "@core/util/abi"
import { isContractAddress } from "@core/util/isContractAddress"
import {
  decodeFunctionData,
  getAbiItem,
  getContract,
  type PublicClient,
  parseAbi,
  type TransactionRequestBase,
} from "viem"

const MOON_CHAIN_PRECOMPILES = [
  {
    address: "0x0000000000000000000000000000000000000800",
    contractType: "MoonStaking",
    abi: abiMoonStaking,
  },
  {
    address: "0x0000000000000000000000000000000000000812",
    contractType: "MoonConvictionVoting",
    abi: abiMoonConvictionVoting,
  },
  {
    address: "0x0000000000000000000000000000000000000804",
    contractType: "MoonXTokens",
    abi: abiMoonXTokens,
  },
] as const

const STANDARD_CONTRACTS = [
  {
    contractType: "ERC20",
    abi: parseAbi(abiErc20),
  },
  {
    contractType: "ERC721",
    abi: parseAbi(abiErc721),
  },
  {
    contractType: "ERC1155",
    abi: parseAbi(abiErc1155),
  },
] as const

// ERC1155 metadata uris may be shared by every token of the collection, with an `{id}` placeholder
// that clients substitute with the token id, as 64 lowercase hex characters
const expandErc1155Uri = (uri: string, tokenId: bigint) =>
  uri.replace("{id}", tokenId.toString(16).padStart(64, "0"))

// on Permit2 the token is an argument of the call, not the contract being called
const getPermit2TokenAddress = (functionName: string, args: readonly unknown[] | undefined) => {
  if (functionName === "approve") return args?.[0] as `0x${string}` | undefined
  if (functionName === "transferFrom") return args?.[3] as `0x${string}` | undefined
  return undefined
}

const readErc20Metadata = async (publicClient: PublicClient, address: `0x${string}`) => {
  const contract = getContract({
    address,
    abi: parseAbi(abiErc20),
    client: { public: publicClient },
  })

  // metadata is optional, a token that doesn't implement it is still spendable
  const [name, symbol, decimals] = await Promise.allSettled([
    contract.read.name(),
    contract.read.symbol(),
    contract.read.decimals(),
  ])

  return {
    name: name.status === "fulfilled" ? name.value : undefined,
    symbol: symbol.status === "fulfilled" ? symbol.value : undefined,
    decimals: decimals.status === "fulfilled" ? decimals.value : undefined,
  }
}

export const decodeEvmTransaction = async (
  publicClient: PublicClient,
  tx: TransactionRequestBase
) => {
  // transactions that provision a contract have an empty 'to' field
  const { to: targetAddress, value, data } = tx

  const isContractCall = targetAddress
    ? await isContractAddress(publicClient, targetAddress)
    : false

  if (isContractCall && data && targetAddress) {
    // moon chains precompiles
    if (publicClient.chain?.id && [1284, 1285, 1287].includes(publicClient.chain.id)) {
      for (const { address, contractType, abi } of MOON_CHAIN_PRECOMPILES) {
        if (address === targetAddress) {
          const contractCall = decodeFunctionData({ abi, data })
          return {
            contractType,
            contractCall,
            targetAddress,
            isContractCall: true,
            value,
            abi,
          }
        }
      }
    }

    // Permit2 allowances look nothing like ERC20 ones: the token is an argument, and its `approve`
    // selector differs from ERC20's - without this branch the whole contract is undecodable
    if (targetAddress.toLowerCase() === PERMIT2_ADDRESS.toLowerCase()) {
      try {
        const abi = parseAbi(abiPermit2)
        const contractCall = decodeFunctionData({ abi, data })

        const tokenAddress = getPermit2TokenAddress(contractCall.functionName, contractCall.args)

        return {
          contractType: "Permit2",
          contractCall,
          abi,
          targetAddress,
          isContractCall: true,
          value,
          asset: tokenAddress
            ? { ...(await readErc20Metadata(publicClient, tokenAddress)), tokenAddress }
            : undefined,
        }
      } catch {
        // unknown selector, fall through to the generic decoding
      }
    }

    // common contracts
    for (const { contractType, abi } of STANDARD_CONTRACTS) {
      try {
        if (contractType === "ERC20") {
          const contractCall = decodeFunctionData({ abi, data })

          const contract = getContract({
            address: targetAddress,
            abi,
            client: { public: publicClient },
          })

          const [name, symbol, decimals] = await Promise.all([
            contract.read.name(),
            contract.read.symbol(),
            contract.read.decimals(),
          ])

          return {
            contractType,
            contractCall,
            abi,
            targetAddress,
            isContractCall: true,
            value,
            asset: { name, symbol, decimals },
          }
        }
        if (contractType === "ERC721") {
          const contractCall = decodeFunctionData({ abi, data })

          const abiItem = getAbiItem({
            abi,
            args: contractCall.args,
            name: contractCall.functionName,
          })
          // biome-ignore lint/suspicious/noExplicitAny: legacy
          const tokenIdIndex = abiItem.inputs.findIndex((input: any) => input.name === "tokenId")
          const tokenId =
            tokenIdIndex > -1 ? (contractCall.args?.[tokenIdIndex] as bigint) : undefined

          const contract = getContract({
            address: targetAddress,
            abi,
            client: { public: publicClient },
          })

          // some calls may fail as not all NFTs implement the metadata functions
          const [name, symbol, tokenURI] = await Promise.allSettled([
            contract.read.name(),
            contract.read.symbol(),
            tokenId ? contract.read.tokenURI([tokenId]) : undefined,
          ])

          const asset = [name.status, symbol.status, tokenURI].includes("fulfilled")
            ? {
                name: name.status === "fulfilled" ? name.value : undefined,
                symbol: symbol.status === "fulfilled" ? symbol.value : undefined,
                tokenId,
                tokenURI: tokenURI.status === "fulfilled" ? tokenURI.value : undefined,
                decimals: 1,
              }
            : undefined

          return {
            contractType,
            contractCall,
            abi,
            targetAddress,
            isContractCall: true,
            value,
            asset,
          }
        }
        if (contractType === "ERC1155") {
          const contractCall = decodeFunctionData({ abi, data })

          const { functionName, args } = contractCall
          const tokenIds =
            functionName === "safeBatchTransferFrom"
              ? (args[2] as readonly bigint[])
              : functionName === "safeTransferFrom"
                ? [args[2] as bigint]
                : []

          const contract = getContract({
            address: targetAddress,
            abi,
            client: { public: publicClient },
          })

          // metadata is optional, and a single uri may cover every token id of the collection
          const uri = tokenIds.length
            ? await contract.read.uri([tokenIds[0]]).catch(() => undefined)
            : undefined

          return {
            contractType,
            contractCall,
            abi,
            targetAddress,
            isContractCall: true,
            value,
            asset: {
              tokenId: tokenIds[0],
              tokenURI: uri ? expandErc1155Uri(uri, tokenIds[0]) : undefined,
              decimals: 0,
            },
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return { contractType: "unknown", targetAddress, isContractCall, value }
}

export type DecodedEvmTransaction = Awaited<ReturnType<typeof decodeEvmTransaction>>
