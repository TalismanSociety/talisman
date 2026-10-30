import type { ApprovalInfo } from "@core/domains/swaps/types"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { encodeFunctionData, erc20Abi, type Hex, type PublicClient } from "viem"

type Approval = NonNullable<ApprovalInfo>

export type AllowanceStep = "none" | "revoke" | "approve"

/**
 * Some tokens (notably USDT on Ethereum mainnet) revert on `approve()` from a non-zero allowance
 * to another non-zero one, so a short non-zero allowance is revoked to zero before the real approval.
 */
export const readAllowanceStep = async (
  client: PublicClient,
  approval: Approval
): Promise<AllowanceStep> => {
  const allowance = await client.readContract({
    address: approval.tokenAddress as Hex,
    abi: erc20Abi,
    functionName: "allowance",
    args: [approval.fromAddress as Hex, approval.contractAddress as Hex],
  })
  if (allowance >= approval.amount) return "none"
  return allowance > 0n ? "revoke" : "approve"
}

export const approveRequest = (
  tokenId: string,
  approval: Approval,
  step: Exclude<AllowanceStep, "none">
) => {
  const amount = step === "revoke" ? 0n : approval.amount
  const txInfo: WalletTransactionInfo = {
    type: "approve-erc20",
    tokenId,
    contractAddress: approval.contractAddress,
    amount: amount.toString(),
  }
  return {
    amount,
    call: {
      to: approval.tokenAddress as Hex,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [approval.contractAddress as Hex, amount],
      }),
    },
    txInfo,
  }
}
