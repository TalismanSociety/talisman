import { log } from "@common/log"
import { getMetadataRpcFromDef } from "@core/domains/metadata/helpers"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import { MultiAddress } from "@polkadot-api/descriptors"
import type { Instruction } from "@solana/kit"
import { createNoopSigner, address as solAddress } from "@solana/kit"
import { getTransferSolInstruction } from "@solana-program/system"
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token"
import type { SolRpc } from "@talismn/chain-connectors"
import type { EthNetworkId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { getScaleApi, type ScaleApi } from "@talismn/sapi"
import { buildUnsignedTransaction, type SolTransaction } from "@talismn/solana"
import { api } from "@ui/api"
import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { getNetworkById$, getNetworksMapById$, getToken$ } from "@ui/state/chaindata"
import BigNumber from "bignumber.js"
import { firstValueFrom } from "rxjs"
import { encodeFunctionData, erc20Abi, type TransactionRequest } from "viem"
import { parseUserInputToPlanck } from "../swap-utils"
import type { QuoteFee, SwapModuleTransaction, SwapTransactionContext } from "./common.swap-module"
import { prepareTransactionRequestWithGasCheck } from "./evm-gas-check"

/**
 * Common info needed to build a deposit transaction for a centralized swap.
 * Each provider normalizes its exchange response into this shape.
 */
export type DepositInfo = {
  /** Address to send funds to (the exchange's deposit address) */
  depositAddress: string
  /** Human-readable deposit amount string (will be parsed to planck using asset decimals) */
  depositAmount: string
}

export type DepositSwapAsset = {
  chainId: number | string
  platform: "ethereum" | "polkadot" | "solana" | "bitcoin"
  contractAddress?: string
  assetHubAssetId?: string
  decimals: number
}

// --- Internal helper to get a viem PublicClient for an EVM network ---

const getPublicClient = async (evmNetworkId: EthNetworkId | string | undefined) => {
  if (!evmNetworkId) return undefined
  const evmNetwork = await firstValueFrom(getNetworkById$(evmNetworkId))
  const nativeToken = await firstValueFrom(getToken$(evmNetwork?.nativeTokenId))
  if (!evmNetwork || nativeToken?.type !== "evm-native" || evmNetwork.platform !== "ethereum")
    return undefined
  return getExtensionPublicClient(evmNetwork)
}

// --- Exported functions ---

export async function estimateDepositGas(
  fromAsset: DepositSwapAsset,
  fromAddress: string
): Promise<QuoteFee | null> {
  if (fromAsset.platform === "ethereum") {
    if (!isEthereumAddress(fromAddress)) return null // invalid ethereum address
    const knownEvmNetworks = await firstValueFrom(getNetworksMapById$({ platform: "ethereum" }))
    const network = knownEvmNetworks[fromAsset.chainId]
    const nativeToken = await firstValueFrom(getToken$(network?.nativeTokenId))

    const data = fromAsset.contractAddress
      ? encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [fromAddress, 0n] })
      : undefined

    if (network && nativeToken) {
      const client = await getPublicClient(network.id)
      if (!client) return null
      const gasPrice = await client.getGasPrice()
      // the to address and amount dont matter, we just need to place any address here for the estimation
      const gasLimit = await client.estimateGas({
        account: fromAddress as `0x${string}`,
        data,
        to: fromAsset.contractAddress ? (fromAsset.contractAddress as `0x${string}`) : fromAddress,
        value: 0n,
      })
      const amount = BigNumber(gasPrice.toString())
        .times(gasLimit.toString())
        .times(10 ** -(nativeToken.decimals ?? 0))
      return { name: "Est. Gas Fees", tokenId: nativeToken.id, amount }
    }

    return null
  }

  if (fromAsset.platform === "polkadot") {
    try {
      const knownSubstrateNetworks = await firstValueFrom(
        getNetworksMapById$({ platform: "polkadot" })
      )
      const network = knownSubstrateNetworks[fromAsset.chainId]
      if (!network || !("genesisHash" in network)) return null

      const nativeToken = await firstValueFrom(getToken$(network.nativeTokenId))
      if (!nativeToken) return null

      const metadataDef = await api.subChainMetadata(network.genesisHash)
      if (!metadataDef?.metadataRpc) return null

      const metadataRpc = getMetadataRpcFromDef(metadataDef)
      if (!metadataRpc) return null

      const sapi = getScaleApi(
        {
          chainId: network.id,
          send: (...args) => api.subSend(network.id, ...args),
        },
        metadataRpc as `0x${string}`,
        nativeToken,
        network.hasCheckMetadataHash,
        network.signedExtensions,
        network.registryTypes
      )

      // Create a dummy transfer payload for fee estimation (amount/recipient don't affect the fee)
      const isAssetHubToken = fromAsset.assetHubAssetId !== undefined
      const { payload } = await sapi.getExtrinsicPayload(
        isAssetHubToken ? "Assets" : "Balances",
        "transfer_keep_alive",
        isAssetHubToken
          ? {
              id: fromAsset.assetHubAssetId,
              target: MultiAddress.Id(fromAddress),
              amount: 0n,
            }
          : { dest: MultiAddress.Id(fromAddress), value: 0n },
        { address: fromAddress }
      )

      const fee = await sapi.getFeeEstimate(payload)
      const amount = BigNumber(fee.toString()).times(10 ** -nativeToken.decimals)
      return { name: "Est. Gas Fees", tokenId: nativeToken.id, amount }
    } catch (err) {
      log.error(new Error("Failed to estimate substrate gas", { cause: err }))
      return null
    }
  }

  return null
}

async function buildEvmDepositTransaction(params: {
  fromAsset: DepositSwapAsset
  fromAddress: string
  deposit: DepositInfo
}): Promise<TransactionRequest | undefined> {
  try {
    const { fromAsset, fromAddress, deposit } = params
    if (!fromAddress) throw new Error("Missing from address")

    if (fromAsset.platform !== "ethereum") return

    const knownEvmNetworks = await firstValueFrom(getNetworksMapById$({ platform: "ethereum" }))
    const evmNetwork = knownEvmNetworks[fromAsset.chainId.toString()]
    if (!evmNetwork) throw new Error("Network not supported")

    const depositAmount = parseUserInputToPlanck(deposit.depositAmount, fromAsset.decimals)

    const publicClient = await getPublicClient(evmNetwork.id)
    if (!publicClient || !evmNetwork.nativeTokenId) throw new Error("Missing public client")

    if (!fromAsset.contractAddress)
      return prepareTransactionRequestWithGasCheck(publicClient, evmNetwork.nativeTokenId, {
        chain: null,
        to: deposit.depositAddress as `0x${string}`,
        value: depositAmount,
        account: fromAddress as `0x${string}`,
      })

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [deposit.depositAddress as `0x${string}`, depositAmount],
    })
    return prepareTransactionRequestWithGasCheck(publicClient, evmNetwork.nativeTokenId, {
      chain: null,
      to: fromAsset.contractAddress as `0x${string}`,
      data,
      value: 0n,
      account: fromAddress as `0x${string}`,
    })
  } catch (cause) {
    // biome-ignore lint/suspicious/noConsole: legacy
    console.error(new Error("Failed to create evm transaction", { cause }))
    throw cause
  }
}

async function buildSubstrateDepositPayload(params: {
  fromAsset: DepositSwapAsset
  fromAddress: string
  deposit: DepositInfo
  sapi: ScaleApi
  allowReap?: boolean
}): Promise<{ payload: SignerPayloadJSON; txMetadata?: Uint8Array } | null> {
  try {
    const { fromAsset, fromAddress, deposit, sapi, allowReap } = params
    if (!sapi) return null

    if (!fromAddress) throw new Error("Missing from address")

    if (fromAsset.platform !== "polkadot") return null

    const depositAmount = parseUserInputToPlanck(deposit.depositAmount, fromAsset.decimals)

    const payload =
      fromAsset.assetHubAssetId !== undefined
        ? await sapi.getExtrinsicPayload(
            "Assets",
            allowReap ? "transfer" : "transfer_keep_alive",
            {
              id: fromAsset.assetHubAssetId,
              target: MultiAddress.Id(deposit.depositAddress),
              amount: depositAmount,
            },
            { address: fromAddress }
          )
        : await sapi.getExtrinsicPayload(
            "Balances",
            allowReap ? "transfer_allow_death" : "transfer_keep_alive",
            { dest: MultiAddress.Id(deposit.depositAddress), value: depositAmount },
            { address: fromAddress }
          )

    return payload
  } catch (cause) {
    // biome-ignore lint/suspicious/noConsole: legacy
    console.error(new Error("Failed to create substrate payload", { cause }))
    throw cause
  }
}

async function buildSolanaDepositTransaction(params: {
  fromAsset: DepositSwapAsset
  fromAddress: string
  deposit: DepositInfo
  rpc: SolRpc
}): Promise<SolTransaction | undefined> {
  try {
    const { fromAsset, fromAddress, deposit, rpc } = params
    if (!fromAddress) throw new Error("Missing from address")
    if (fromAsset.platform !== "solana") return

    const depositAmount = parseUserInputToPlanck(deposit.depositAmount, fromAsset.decimals)
    const fromWallet = solAddress(fromAddress)
    const toWallet = solAddress(deposit.depositAddress)

    const instructions: Instruction[] = []

    if (!fromAsset.contractAddress) {
      instructions.push(
        getTransferSolInstruction({
          source: createNoopSigner(fromWallet), // signature is provided at signing time
          destination: toWallet,
          amount: BigInt(depositAmount),
        })
      )
    } else {
      const mint = solAddress(fromAsset.contractAddress)
      const [sourceAta] = await findAssociatedTokenPda({
        mint,
        owner: fromWallet,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })
      const [destAta] = await findAssociatedTokenPda({
        mint,
        owner: toWallet,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })

      instructions.push(
        getCreateAssociatedTokenIdempotentInstruction({
          payer: createNoopSigner(fromWallet),
          ata: destAta,
          owner: toWallet,
          mint,
        }),
        getTransferInstruction({
          source: sourceAta,
          destination: destAta,
          authority: fromWallet,
          amount: BigInt(depositAmount),
        })
      )
    }

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

    return buildUnsignedTransaction({
      feePayer: fromAddress,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      instructions,
    })
  } catch (cause) {
    // biome-ignore lint/suspicious/noConsole: legacy
    console.error(new Error("Failed to create solana transaction", { cause }))
    throw cause
  }
}

export async function buildDepositTransaction(params: {
  fromAsset: DepositSwapAsset
  fromAddress: string
  deposit: DepositInfo
  context: SwapTransactionContext
}): Promise<SwapModuleTransaction | null> {
  const { fromAsset, context } = params

  switch (fromAsset.platform) {
    case "ethereum": {
      const transaction = await buildEvmDepositTransaction(params)
      return transaction ? { platform: "ethereum", transaction } : null
    }
    case "polkadot": {
      if (context.platform !== "polkadot") return null
      const payload = await buildSubstrateDepositPayload({
        ...params,
        sapi: context.sapi,
        allowReap: context.allowReap,
      })
      return payload
        ? { platform: "polkadot", payload: payload.payload, txMetadata: payload.txMetadata }
        : null
    }
    case "solana": {
      if (context.platform !== "solana") return null
      const transaction = await buildSolanaDepositTransaction({
        ...params,
        rpc: context.rpc,
      })
      return transaction ? { platform: "solana", transaction } : null
    }
    case "bitcoin": {
      // bitcoin deposits are a plain send to the exchange's address — normalize the
      // target here; the UI builds and signs the PSBT from the sender's utxos
      return {
        platform: "bitcoin",
        networkId: fromAsset.chainId.toString(),
        depositAddress: params.deposit.depositAddress,
        depositAmountSats: parseUserInputToPlanck(
          params.deposit.depositAmount,
          fromAsset.decimals
        ).toString(),
      }
    }
    default:
      return null
  }
}
