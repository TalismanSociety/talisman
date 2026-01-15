import type { Balances } from "@talismn/balances"
import { getNetworks$ } from "@ui/state/chaindata"

import { portfolioGlobalData$ } from "@ui/state/portfolio"
import { firstValueFrom, timeout } from "rxjs"
import type { TransferActionParams } from "../../actions/types"
import { setPendingAction } from "../../state/pendingActions"
import type { ToolHandler, ToolHandlerResult } from "../../types"

interface SendTokensInput {
  token_symbol: string
  amount: string
  to_address: string
  chain_id?: string
}

const PORTFOLIO_TIMEOUT_MS = 10000
const NETWORKS_TIMEOUT_MS = 5000

// Basic address validation
function isValidAddress(address: string): boolean {
  // Check for Ethereum-style address
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) return true
  // Check for Substrate-style address (basic check)
  if (/^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address)) return true
  // Check for Solana-style address
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return true
  return false
}

export const sendTokens: ToolHandler<SendTokensInput> = async (
  input
): Promise<ToolHandlerResult> => {
  // Validate address
  if (!isValidAddress(input.to_address)) {
    return {
      success: false,
      error: "Invalid recipient address format",
    }
  }

  // Get user's balances with timeout to prevent hanging
  let portfolioBalances: Balances
  let networks: Network[]
  try {
    const portfolioData: Balances = await firstValueFrom(
      portfolioGlobalData$.pipe(
        timeout({
          first: PORTFOLIO_TIMEOUT_MS,
          with: () => {
            throw new Error("Timed out loading portfolio data. Please try again.")
          },
        })
      )
    )
    portfolioBalances = portfolioData.portfolioBalances

    networks = await firstValueFrom(
      getNetworks$({ activeOnly: true }).pipe(
        timeout({
          first: NETWORKS_TIMEOUT_MS,
          with: () => {
            throw new Error("Timed out loading network data. Please try again.")
          },
        })
      )
    )
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load wallet data",
    }
  }

  const lowerSymbol = input.token_symbol.toLowerCase()

  // Find the token in user's balances
  const matchingBalances = portfolioBalances.each.filter((b) => {
    const symbolMatch = b.token?.symbol?.toLowerCase() === lowerSymbol
    if (!symbolMatch) return false

    if (input.chain_id) {
      const chainMatch =
        b.network?.name?.toLowerCase().includes(input.chain_id.toLowerCase()) ||
        b.network?.id?.includes(input.chain_id)
      return chainMatch
    }

    return true
  })

  if (matchingBalances.length === 0) {
    const availableTokens = portfolioBalances.each.map((b) => b.token?.symbol).filter(Boolean)
    const uniqueTokens = [...new Set(availableTokens)].slice(0, 10).join(", ")

    return {
      success: false,
      error: `Token ${input.token_symbol} not found in your wallet. Available tokens: ${uniqueTokens}`,
    }
  }

  // If multiple chains have this token, prefer the one with highest balance
  const balance = matchingBalances.sort(
    (a, b) => (b.total.fiat("usd") ?? 0) - (a.total.fiat("usd") ?? 0)
  )[0]

  const availableBalance = parseFloat(balance.transferable.tokens || "0")
  const sendAmount = parseFloat(input.amount)

  if (Number.isNaN(sendAmount) || sendAmount <= 0) {
    return {
      success: false,
      error: "Invalid amount",
    }
  }

  if (sendAmount > availableBalance) {
    return {
      success: false,
      error: `Insufficient balance. You have ${availableBalance} ${input.token_symbol} available but tried to send ${input.amount}`,
    }
  }

  const network = networks.find((n) => n.id === balance.networkId)
  const fiatValue = (balance.total.fiat("usd") ?? 0) * (sendAmount / availableBalance)

  // Create pending action for user confirmation
  const actionId = crypto.randomUUID()

  // Check if sending to self
  const isSendingToSelf = balance.address.toLowerCase() === input.to_address.toLowerCase()

  // Calculate planck amount for execution
  const decimals = balance.token?.decimals || 18
  const amountPlanck = BigInt(Math.floor(sendAmount * 10 ** decimals))

  // Determine platform from network
  const platform = network?.platform as "ethereum" | "polkadot" | "solana" | undefined
  if (!platform) {
    return {
      success: false,
      error: `Unsupported network platform for ${network?.name || balance.networkId}`,
    }
  }

  // Get token contract address if applicable
  const token = balance.token
  const contractAddress =
    token?.type === "evm-erc20" && "contractAddress" in token ? token.contractAddress : undefined

  // Build transaction data for execution
  const txData: TransferActionParams["txData"] = {
    tokenId: balance.tokenId,
    networkId: balance.networkId,
    from: balance.address,
    to: input.to_address,
    planck: amountPlanck.toString(),
    platform,
    tokenType: token?.type || "unknown",
    contractAddress,
  }

  setPendingAction({
    id: actionId,
    type: "transfer",
    params: {
      ...input,
      txData,
    } as TransferActionParams,
    preview: {
      summary: `Send ${input.amount} ${input.token_symbol} to ${input.to_address.slice(0, 8)}...${input.to_address.slice(-6)}`,
      details: {
        token: input.token_symbol.toUpperCase(),
        amount: input.amount,
        fiatValue: `~$${fiatValue.toFixed(2)}`,
        recipient: input.to_address,
        fromAddress: balance.address,
        chain: network?.name || balance.networkId,
        remainingBalance: (availableBalance - sendAmount).toFixed(6),
      },
      warnings: [
        ...(isSendingToSelf ? ["Warning: You are sending to your own address"] : []),
        ...(sendAmount > availableBalance * 0.9
          ? ["You are sending most of your balance. Make sure to keep some for transaction fees."]
          : []),
      ].filter(Boolean) as string[],
    },
    status: "pending_confirmation",
  })

  return {
    success: true,
    requiresConfirmation: true,
    actionId,
    message: `I've prepared to send ${input.amount} ${input.token_symbol} (~$${fiatValue.toFixed(2)}) to ${input.to_address.slice(0, 8)}...${input.to_address.slice(-6)} on ${network?.name || "the network"}. Please review and confirm the transaction.`,
  }
}
