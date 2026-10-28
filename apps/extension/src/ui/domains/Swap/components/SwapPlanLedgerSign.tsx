import { log } from "@common/log"
import { prepareTransactionRequestWithGasCheck } from "@core/domains/swaps/exports"
import { deriveLegInput, fromPersistedLeg, readLegBalance } from "@core/domains/swaps/plans/helpers"
import type { PlanLeg, SwapPlan } from "@core/domains/swaps/plans/types"
import type { ApprovalInfo } from "@core/domains/swaps/types"
import { evmNativeTokenId, networkIdFromTokenId } from "@talismn/chaindata-provider"
import type { AccountType } from "@talismn/keyring"
import { skipToken, useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSubmitButton"
import type { TxSubmitButtonTransaction } from "@ui/domains/Sign/TxSubmitButton/types"
import { getToken$ } from "@ui/state/chaindata"
import { type FC, useState } from "react"
import { useTranslation } from "react-i18next"
import { firstValueFrom } from "rxjs"
import { encodeFunctionData, erc20Abi, type Hex, type PublicClient } from "viem"

import type { SwapModule } from "../swap-modules/common.swap-module"
import { getEvmPublicClient } from "../swap-modules/evm-network"
import { swapModules } from "../swaps.api"

/** what the user signs next for a leg: the leg itself, or first the allowance its spender needs */
export type PlanLegSignRequest =
  | { signs: "leg"; tx: TxSubmitButtonTransaction }
  | { signs: "approval"; symbol: string; tx: TxSubmitButtonTransaction }

const APPROVAL_WAIT_MS = 2 * 60_000

const isLedgerSigner = (signerType: AccountType | undefined) => !!signerType?.startsWith("ledger-")

const legApproval = (module: SwapModule, leg: PlanLeg) =>
  module.getApprovalInfo?.({
    fromTokenId: leg.quote.fromTokenId,
    toTokenId: leg.quote.toTokenId,
    fromAmount: BigInt(leg.quote.inputAmount),
    fromAddress: leg.quote.signer,
    toAddress: leg.quote.recipient,
    quoteData: { legs: [fromPersistedLeg(leg.quote)] },
  }) ?? null

const readAllowance = (client: PublicClient, approval: NonNullable<ApprovalInfo>) =>
  client.readContract({
    address: approval.tokenAddress as Hex,
    abi: erc20Abi,
    functionName: "allowance",
    args: [approval.fromAddress as Hex, approval.contractAddress as Hex],
  })

const buildApprovalTransaction = async (
  client: PublicClient,
  leg: PlanLeg,
  approval: NonNullable<ApprovalInfo>,
  nonce: number
): Promise<PlanLegSignRequest> => {
  const networkId = networkIdFromTokenId(leg.quote.fromTokenId)
  const signer = leg.quote.signer as Hex
  const [token, transaction] = await Promise.all([
    firstValueFrom(getToken$(leg.quote.fromTokenId)),
    prepareTransactionRequestWithGasCheck(client, evmNativeTokenId(networkId), {
      chain: null,
      account: signer,
      to: approval.tokenAddress as Hex,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [approval.contractAddress as Hex, approval.amount],
      }),
    }),
  ])
  const { to, data, value, gas, maxFeePerGas, maxPriorityFeePerGas } = transaction
  return {
    signs: "approval",
    symbol: token?.symbol ?? "",
    tx: {
      platform: "ethereum",
      networkId,
      payload: {
        type: "eip1559",
        from: signer,
        to,
        data,
        value,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
      },
      txInfo: {
        type: "approve-erc20",
        tokenId: leg.quote.fromTokenId,
        contractAddress: approval.contractAddress,
        amount: approval.amount.toString(),
      },
    },
  }
}

const buildHardwareLegTransaction = async (
  plan: SwapPlan,
  index: number
): Promise<PlanLegSignRequest> => {
  const leg = plan.legs[index]
  const module = swapModules.find((candidate) => candidate.protocol === leg.quote.protocol)
  if (!module) throw new Error("This swap provider is unavailable")

  const networkId = networkIdFromTokenId(leg.quote.fromTokenId)
  const signer = leg.quote.signer as Hex
  const client = await getEvmPublicClient(networkId)
  const approval = legApproval(module, leg)
  const [balance, nextNonce, allowance] = await Promise.all([
    readLegBalance(client, leg.quote),
    leg.nonce ?? api.ethGetTransactionsCount(signer, networkId),
    approval ? readAllowance(client, approval) : null,
  ])
  if (approval && allowance !== null && allowance < approval.amount)
    return buildApprovalTransaction(client, leg, approval, nextNonce)

  const built = await module.buildLeg({
    leg: fromPersistedLeg(leg.quote),
    input: deriveLegInput(plan, index, balance),
    context: { platform: "ethereum" },
    exchange: null,
    slippage: plan.summary.slippage,
  })
  if (built.transaction.platform !== "ethereum")
    throw new Error("Only an EVM leg is signed on screen")

  const { to, data, value, gas, maxFeePerGas, maxPriorityFeePerGas } = built.transaction.transaction
  return {
    signs: "leg",
    tx: {
      platform: "ethereum",
      networkId,
      payload: {
        type: "eip1559",
        from: signer,
        to,
        data,
        value,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce: nextNonce,
      },
      txInfo: { ...built.txInfo, plan: { id: plan.id, leg: index } },
    },
  }
}

/**
 * A user-signed leg is built here, on what the previous leg landed, and signed on screen.
 * The signed bytes go to the background, which admits them against the leg's bound before sending.
 * Every sign attempt that ends rebuilds it, so a retry never reuses a nonce another transaction took,
 * and the allowance is read on every build, so an approval that mined is never asked for twice.
 */
export const useHardwareLegTransaction = (
  plan: SwapPlan | null | undefined,
  index: number | null
) =>
  useQuery({
    queryKey: ["swap-plan-hardware-leg", plan?.id, index, plan?.updatedAt],
    queryFn: plan && index !== null ? () => buildHardwareLegTransaction(plan, index) : skipToken,
    retry: false,
  })

const waitForApproval = async (tx: TxSubmitButtonTransaction, hash: string) => {
  if (tx.platform !== "ethereum") return
  try {
    const client = await getEvmPublicClient(tx.networkId)
    await client.waitForTransactionReceipt({ hash: hash as Hex, timeout: APPROVAL_WAIT_MS })
  } catch (cause) {
    log.warn("Could not wait for the approval to mine", { cause, hash })
  }
}

export const SwapPlanLedgerSign: FC<{
  request: PlanLegSignRequest | undefined
  signerType: AccountType | undefined
  onSignAttemptEnded: () => void
  containerId?: string
}> = ({ request, signerType, onSignAttemptEnded, containerId }) => {
  const { t } = useTranslation()
  const [rejectedSubmissions, setRejectedSubmissions] = useState(0)
  const [isApprovalPending, setIsApprovalPending] = useState(false)

  const label =
    request?.signs === "approval"
      ? t("Approve {{symbol}}", { symbol: request.symbol })
      : isLedgerSigner(signerType)
        ? t("Sign on Ledger")
        : t("Sign")

  const handleSubmit = async (hash: string) => {
    if (request?.signs !== "approval") return
    setIsApprovalPending(true)
    await waitForApproval(request.tx, hash)
    setIsApprovalPending(false)
    onSignAttemptEnded()
  }

  return (
    <TxSubmitButton
      key={rejectedSubmissions}
      containerId={containerId}
      tx={request?.tx}
      label={label}
      isFinalStep={request?.signs !== "approval"}
      isProcessing={isApprovalPending}
      onSubmit={handleSubmit}
      onError={() => setRejectedSubmissions((count) => count + 1)}
      onPayloadLockChange={(isLocked) => {
        if (!isLocked) onSignAttemptEnded()
      }}
      disabled={!request}
    />
  )
}
