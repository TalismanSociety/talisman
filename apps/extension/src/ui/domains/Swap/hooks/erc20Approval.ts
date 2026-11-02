import type { ApprovalInfo } from "@core/domains/swaps/types"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { isAddressEqual } from "@talismn/crypto"
import { encodeFunctionData, erc20Abi, type Hex, type PublicClient } from "viem"

type Approval = NonNullable<ApprovalInfo>

export type AllowanceStep = "none" | "revoke" | "approve"

/** the receipt of the approval sent last, mined or reverted: either way its nonce is spent */
export type MinedApproval = {
  networkId: string
  from: string
  nonce: number
  blockNumber: bigint
}

/** an RPC node behind the approval's block still reports its nonce as the next one */
export const nonceAfter = (
  mined: MinedApproval | undefined,
  from: string | undefined,
  networkId: string | undefined
): number | undefined =>
  mined && from && networkId === mined.networkId && isAddressEqual(from, mined.from)
    ? mined.nonce + 1
    : undefined

/** an RPC node behind the approval's block still reports the allowance before it */
export const minedBlockOn = (
  mined: MinedApproval | undefined,
  approval: Pick<Approval, "chainId" | "fromAddress">
): bigint | undefined =>
  mined &&
  String(approval.chainId) === mined.networkId &&
  isAddressEqual(approval.fromAddress, mined.from)
    ? mined.blockNumber
    : undefined

/**
 * Some tokens (notably USDT on Ethereum mainnet) revert on `approve()` from a non-zero allowance
 * to another non-zero one, so a short non-zero allowance is revoked to zero before the real approval.
 */
export const readAllowanceStep = async (
  client: PublicClient,
  approval: Approval,
  blockNumber?: bigint
): Promise<AllowanceStep> => {
  const allowance = await client.readContract({
    address: approval.tokenAddress as Hex,
    abi: erc20Abi,
    functionName: "allowance",
    args: [approval.fromAddress as Hex, approval.contractAddress as Hex],
    blockNumber,
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
