import { log } from "@common/log"
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
import { isEthereumAddress } from "@talismn/crypto"
import { buildUnsignedTransaction, type SolTransaction } from "@talismn/solana"
import BigNumber from "bignumber.js"
import { encodeFunctionData, erc20Abi, type TransactionRequest } from "viem"
import { parseUserInputToPlanck } from "../swap-utils"
import type {
  QuoteFee,
  SwapEnv,
  SwapModuleTransaction,
  SwapTransactionContext,
} from "./common.swap-module"
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
  platform: "ethereum" | "polkadot" | "solana"
  contractAddress?: string
  assetHubAssetId?: string
  decimals: number
}

// --- Exported functions ---

export type DepositTransactionsEnv = Pick<
  SwapEnv,
  | "getNetworksMap"
  | "getToken"
  | "findEvmClient"
  | "estimateSubstrateDepositFee"
  | "buildSubstrateDeposit"
>

export async function estimateDepositGas(
  env: DepositTransactionsEnv,
  fromAsset: DepositSwapAsset,
  fromAddress: string
): Promise<QuoteFee | null> {
  if (fromAsset.platform === "ethereum") {
    if (!isEthereumAddress(fromAddress)) return null // invalid ethereum address
    const knownEvmNetworks = await env.getNetworksMap("ethereum")
    const network = knownEvmNetworks[fromAsset.chainId]
    const nativeToken = await env.getToken(network?.nativeTokenId)

    const data = fromAsset.contractAddress
      ? encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [fromAddress, 0n] })
      : undefined

    if (network && nativeToken) {
      const client = await env.findEvmClient(network.id)
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
      return { name: "Est. Gas Fees", gas: true, tokenId: nativeToken.id, amount }
    }

    return null
  }

  if (fromAsset.platform === "polkadot")
    return env.estimateSubstrateDepositFee(fromAsset, fromAddress)

  return null
}

async function buildEvmDepositTransaction(
  env: DepositTransactionsEnv,
  params: {
    fromAsset: DepositSwapAsset
    fromAddress: string
    deposit: DepositInfo
  }
): Promise<TransactionRequest | undefined> {
  try {
    const { fromAsset, fromAddress, deposit } = params
    if (!fromAddress) throw new Error("Missing from address")

    if (fromAsset.platform !== "ethereum") return

    const knownEvmNetworks = await env.getNetworksMap("ethereum")
    const evmNetwork = knownEvmNetworks[fromAsset.chainId.toString()]
    if (!evmNetwork) throw new Error("Network not supported")

    const depositAmount = parseUserInputToPlanck(deposit.depositAmount, fromAsset.decimals)

    const publicClient = await env.findEvmClient(evmNetwork.id)
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
    log.error(new Error("Failed to create evm transaction", { cause }))
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
    log.error(new Error("Failed to create solana transaction", { cause }))
    throw cause
  }
}

export type DepositTransactionParams = {
  fromAsset: DepositSwapAsset
  fromAddress: string
  deposit: DepositInfo
  context: SwapTransactionContext
}

export async function buildDepositTransaction(
  env: DepositTransactionsEnv,
  params: DepositTransactionParams
): Promise<SwapModuleTransaction> {
  const { fromAsset, context } = params

  switch (fromAsset.platform) {
    case "ethereum": {
      const transaction = await buildEvmDepositTransaction(env, params)
      if (!transaction) throw new Error("Failed to build deposit transaction")
      return { platform: "ethereum", transaction }
    }
    case "polkadot":
      return env.buildSubstrateDeposit(params)
    case "solana": {
      if (context.platform !== "solana") throw new Error("Missing solana context")
      const transaction = await buildSolanaDepositTransaction({
        ...params,
        rpc: context.rpc,
      })
      if (!transaction) throw new Error("Failed to build deposit transaction")
      return { platform: "solana", transaction }
    }
  }
}
