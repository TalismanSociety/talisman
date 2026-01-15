import * as lifiSdk from "@lifi/sdk"
import { api } from "@ui/api"
import { getAccountByAddress$ } from "@ui/state/accounts"
import { serializeTransactionRequest, type WalletTransactionInfo } from "extension-core"
import { firstValueFrom } from "rxjs"
import { createPublicClient, encodeFunctionData, erc20Abi, http, zeroAddress } from "viem"
import type { Chain as ViemChain } from "viem/chains"
import * as allEvmChains from "viem/chains"

import type { PendingAction } from "../types"
import type { ApprovalData, ExecutionResult, SwapActionParams } from "./types"

const HARDWARE_WALLET_TYPES = ["ledger-ethereum", "ledger-polkadot", "ledger-solana", "qr"]

// Initialize LI.FI SDK
const apiUrl = "https://lifi.talisman.xyz/v1"
lifiSdk.createConfig({ integrator: "talisman", apiUrl })

export const executeSwapAction = async (
  action: PendingAction,
  onApprovalNeeded?: (data: ApprovalData) => Promise<boolean>
): Promise<ExecutionResult> => {
  const params = action.params as SwapActionParams
  const { routeData } = params

  if (!routeData?.route) {
    return {
      success: false,
      error: "Missing route data. Please get a new quote and try again.",
    }
  }

  // Get the account to check if it's a hardware wallet
  const account = await firstValueFrom(getAccountByAddress$(routeData.fromAddress))

  if (!account) {
    return {
      success: false,
      error: "Account not found. Please try again.",
    }
  }

  // Check for hardware wallet
  if (HARDWARE_WALLET_TYPES.includes(account.type)) {
    return {
      success: false,
      error:
        "Hardware wallet detected. Please use the main wallet interface to sign transactions with your hardware wallet.",
    }
  }

  try {
    const route = routeData.route
    const step = route.steps[0]

    if (!step) {
      return {
        success: false,
        error: "Invalid route: no steps found",
      }
    }

    // Get the transaction from LI.FI
    const { transactionRequest } = await lifiSdk.getStepTransaction(step)

    if (!transactionRequest) {
      return {
        success: false,
        error: "Failed to get transaction from LI.FI",
      }
    }

    // Check if ERC20 approval is needed
    const needsApproval = await checkApprovalNeeded(
      routeData.fromChainId,
      routeData.fromTokenAddress,
      routeData.fromAddress,
      transactionRequest.to as string,
      BigInt(route.fromAmount)
    )

    if (needsApproval) {
      // If approval is needed, we need to handle it
      if (onApprovalNeeded) {
        const approvalData: ApprovalData = {
          tokenAddress: routeData.fromTokenAddress,
          spenderAddress: transactionRequest.to as string,
          amount: route.fromAmount,
          chainId: routeData.fromChainId,
          fromAddress: routeData.fromAddress,
        }

        const shouldProceed = await onApprovalNeeded(approvalData)
        if (!shouldProceed) {
          return {
            success: false,
            error: "Approval cancelled by user",
          }
        }

        // Execute the approval
        const approvalResult = await executeApproval(approvalData)
        if (!approvalResult.success) {
          return approvalResult
        }
      } else {
        // Return that approval is required
        return {
          success: false,
          requiresApproval: true,
          approvalData: {
            tokenAddress: routeData.fromTokenAddress,
            spenderAddress: transactionRequest.to as string,
            amount: route.fromAmount,
            chainId: routeData.fromChainId,
            fromAddress: routeData.fromAddress,
          },
          error: "Token approval required before swap",
        }
      }
    }

    // Prepare the swap transaction
    const tx = {
      from: transactionRequest.from as `0x${string}`,
      to: transactionRequest.to as `0x${string}`,
      data: transactionRequest.data as `0x${string}`,
      value: transactionRequest.value ? BigInt(transactionRequest.value) : 0n,
      chainId: transactionRequest.chainId,
    }

    // Serialize the transaction
    const serialized = serializeTransactionRequest(tx)
    if (!serialized) {
      return {
        success: false,
        error: "Failed to serialize transaction",
      }
    }

    // Build transaction info for tracking
    const txInfo: WalletTransactionInfo = {
      type: "swap-lifi",
      protocolName: step.toolDetails?.name || step.tool,
      fromTokenId: `${routeData.fromChainId}-evm-${routeData.fromTokenAddress === zeroAddress ? "native" : `erc20-${routeData.fromTokenAddress}`}`,
      toTokenId: `${routeData.toChainId}-evm-${routeData.toTokenAddress === zeroAddress ? "native" : `erc20-${routeData.toTokenAddress}`}`,
      fromAmount: route.fromAmount,
      toAmount: route.toAmountMin,
      to: routeData.fromAddress,
    }

    // Sign and send the swap transaction
    const hash = await api.ethSignAndSend(routeData.fromChainId.toString(), serialized, txInfo)

    return {
      success: true,
      hash,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Swap transaction failed",
    }
  }
}

async function checkApprovalNeeded(
  chainId: number,
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  amount: bigint
): Promise<boolean> {
  // Native tokens don't need approval
  if (tokenAddress === zeroAddress || !tokenAddress) {
    return false
  }

  try {
    const chain: ViemChain | undefined = Object.values(allEvmChains).find((c) => c?.id === chainId)
    if (!chain) return false

    const publicClient = createPublicClient({
      chain,
      transport: http(),
    })

    const allowance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "allowance",
      args: [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`],
    })

    return allowance < amount
  } catch (_error) {
    // If we can't check, assume approval is needed
    return true
  }
}

async function executeApproval(approvalData: ApprovalData): Promise<ExecutionResult> {
  try {
    const chain: ViemChain | undefined = Object.values(allEvmChains).find(
      (c) => c?.id === approvalData.chainId
    )
    if (!chain) {
      return {
        success: false,
        error: "Unsupported chain for approval",
      }
    }

    // Encode the approve function call
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [approvalData.spenderAddress as `0x${string}`, BigInt(approvalData.amount)],
    })

    const tx = {
      from: approvalData.fromAddress as `0x${string}`,
      to: approvalData.tokenAddress as `0x${string}`,
      data,
      value: 0n,
    }

    const serialized = serializeTransactionRequest(tx)
    if (!serialized) {
      return {
        success: false,
        error: "Failed to serialize approval transaction",
      }
    }

    const txInfo: WalletTransactionInfo = {
      type: "approve-erc20",
      tokenId: `${approvalData.chainId}-evm-erc20-${approvalData.tokenAddress}`,
      contractAddress: approvalData.spenderAddress,
      amount: approvalData.amount,
    }

    const hash = await api.ethSignAndSend(approvalData.chainId.toString(), serialized, txInfo)

    // Wait for approval to be mined
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` })

    if (receipt.status === "reverted") {
      return {
        success: false,
        error: "Approval transaction was reverted",
      }
    }

    return {
      success: true,
      hash,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Approval transaction failed",
    }
  }
}
