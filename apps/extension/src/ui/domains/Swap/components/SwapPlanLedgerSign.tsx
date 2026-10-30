import { log } from "@common/log"
import { prepareTransactionRequestWithGasCheck } from "@core/domains/swaps/exports"
import { deriveLegInput, fromPersistedLeg, readLegBalance } from "@core/domains/swaps/plans/helpers"
import type { PlanLeg, SwapPlan } from "@core/domains/swaps/plans/types"
import type { ApprovalInfo, QuoteLeg } from "@core/domains/swaps/types"
import { evmNativeTokenId, networkIdFromTokenId } from "@talismn/chaindata-provider"
import { getErrorMessage } from "@talismn/util"
import { skipToken, useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { withPricing } from "@ui/domains/Ethereum/withPricing"
import type { TxSubmitButtonTransactionEth } from "@ui/domains/Sign/TxSubmitButton/types"
import { getToken$ } from "@ui/state/chaindata"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { firstValueFrom } from "rxjs"
import type { Hex, PublicClient } from "viem"

import { type AllowanceStep, approveRequest, readAllowanceStep } from "../hooks/erc20Approval"
import { legApproval } from "../hooks/useLegApprovals"
import { getEvmPublicClient } from "../swap-modules/evm-network"
import { swapModules } from "../swaps.api"
import { SwapTxSubmitButton } from "./SwapTxSubmitButton"
import type { PlanLegSigning } from "./swapTxCards"

/**
 * What the user signs next for a leg: the leg itself, or first the allowance its spender needs.
 * The payload carries no fee: the screen prices it, at the priority the user picks.
 */
type PlanLegSignRequest =
  | {
      signs: "leg"
      tx: TxSubmitButtonTransactionEth
      /** the leg as built on what the previous leg landed, not as quoted */
      built: Pick<QuoteLeg, "inputAmount" | "outputAmount" | "fees">
    }
  | {
      signs: "approval"
      step: Exclude<AllowanceStep, "none">
      symbol: string
      tx: TxSubmitButtonTransactionEth
    }

const APPROVAL_WAIT_MS = 2 * 60_000

const buildApprovalTransaction = async (
  client: PublicClient,
  leg: PlanLeg,
  approval: NonNullable<ApprovalInfo>,
  step: Exclude<AllowanceStep, "none">,
  nonce: number
): Promise<PlanLegSignRequest> => {
  const networkId = networkIdFromTokenId(leg.quote.fromTokenId)
  const signer = leg.quote.signer as Hex
  const { call, txInfo } = approveRequest(leg.quote.fromTokenId, approval, step)
  const [token, { to, data, value, gas }] = await Promise.all([
    firstValueFrom(getToken$(leg.quote.fromTokenId)),
    prepareTransactionRequestWithGasCheck(client, evmNativeTokenId(networkId), {
      chain: null,
      account: signer,
      ...call,
    }),
  ])
  return {
    signs: "approval",
    step,
    symbol: token?.symbol ?? "",
    tx: {
      platform: "ethereum",
      networkId,
      payload: { from: signer, to, data, value, gas, nonce },
      txInfo,
    },
  }
}

const buildOnScreenLegTransaction = async (
  plan: SwapPlan,
  index: number
): Promise<PlanLegSignRequest> => {
  const leg = plan.legs[index]
  const module = swapModules.find((candidate) => candidate.protocol === leg.quote.protocol)
  if (!module) throw new Error("This swap provider is unavailable")

  const networkId = networkIdFromTokenId(leg.quote.fromTokenId)
  const signer = leg.quote.signer as Hex
  const client = await getEvmPublicClient(networkId)
  const approval = legApproval(module, fromPersistedLeg(leg.quote))
  const [balance, nextNonce, allowanceStep] = await Promise.all([
    readLegBalance(client, leg.quote),
    leg.nonce ?? api.ethGetTransactionsCount(signer, networkId),
    approval ? readAllowanceStep(client, approval) : ("none" as const),
  ])
  if (approval && allowanceStep !== "none")
    return buildApprovalTransaction(client, leg, approval, allowanceStep, nextNonce)

  const input = deriveLegInput(plan, index, balance)
  const built = await module.buildLeg({
    leg: fromPersistedLeg(leg.quote),
    input,
    context: { platform: "ethereum" },
    exchange: null,
    slippage: plan.summary.slippage,
  })
  if (built.transaction.platform !== "ethereum")
    throw new Error("Only an EVM leg is signed on screen")

  const { to, data, value, gas } = built.transaction.transaction
  return {
    signs: "leg",
    tx: {
      platform: "ethereum",
      networkId,
      payload: { from: signer, to, data, value, gas, nonce: nextNonce },
      txInfo: { ...built.txInfo, plan: { id: plan.id, leg: index } },
    },
    built: { inputAmount: input, outputAmount: built.expectedOutput, fees: built.fees },
  }
}

/**
 * A user-signed leg is built here, on what the previous leg landed, and signed on screen.
 * The signed bytes go to the background, which admits them against the leg's bound before sending.
 * Every sign attempt that ends rebuilds it, so a retry never reuses a nonce another transaction took,
 * and the allowance is read on every build, so an approval that mined is never asked for twice.
 */
const useOnScreenLegTransaction = (plan: SwapPlan | null | undefined, index: number | null) =>
  useQuery({
    queryKey: ["swap-plan-on-screen-leg", plan?.id, index, plan?.updatedAt],
    queryFn: plan && index !== null ? () => buildOnScreenLegTransaction(plan, index) : skipToken,
    retry: false,
  })

const waitForApproval = async (tx: TxSubmitButtonTransactionEth, hash: Hex) => {
  try {
    const client = await getEvmPublicClient(tx.networkId)
    await client.waitForTransactionReceipt({ hash, timeout: APPROVAL_WAIT_MS })
  } catch (cause) {
    log.warn("Could not wait for the approval to mine", { cause, hash })
  }
}

const signedStep = (request: PlanLegSignRequest) =>
  request.signs === "approval" ? request.step : request.signs

type LegNote<T> = { leg: number; value: T }

const noteFor = <T,>(note: LegNote<T> | undefined, leg: number | null) =>
  note && note.leg === leg ? note.value : undefined

/** an approval's gas limit or priority must not carry over to the approval or leg after it */
const useFreshPricingPer = (
  signed: string | undefined,
  { setCustomSettings, setPriority }: ReturnType<typeof useEthTransaction>
) => {
  const [pricedFor, setPricedFor] = useState(signed)
  if (signed && signed !== pricedFor) {
    setPricedFor(signed)
    setCustomSettings(undefined)
    setPriority(undefined)
  }
}

/** the leg a paused plan waits on the user to sign, priced on screen and signed on the nonce it was built with */
export const usePlanLegSigning = (plan: SwapPlan | null | undefined, index: number | null) => {
  const { t } = useTranslation()
  const request = useOnScreenLegTransaction(plan, index)
  const ethTx = useEthTransaction(request.data?.tx.payload, request.data?.tx.networkId)
  useFreshPricingPer(request.data && `${index}:${signedStep(request.data)}`, ethTx)
  const [sentApproval, setSentApproval] = useState<LegNote<Hex>>()
  const [signFailure, setSignFailure] = useState<LegNote<string>>()
  const [isApprovalPending, setIsApprovalPending] = useState(false)
  const [rejectedSubmissions, setRejectedSubmissions] = useState(0)

  const tx: TxSubmitButtonTransactionEth | undefined =
    request.data && ethTx.transaction && !ethTx.error
      ? {
          ...request.data.tx,
          payload: { ...ethTx.transaction, nonce: request.data.tx.payload.nonce },
          txInfo: request.data.tx.txInfo && withPricing(request.data.tx.txInfo, ethTx),
        }
      : undefined

  const failure = request.error
    ? getErrorMessage(request.error, t("Failed to prepare the transaction"))
    : noteFor(signFailure, index)

  const approvalHash = noteFor(sentApproval, index)
  const signs = request.data?.signs
  const signing = useMemo<PlanLegSigning | null>(
    () => (index === null ? null : { leg: index, signs, approvalHash, isApprovalPending, failure }),
    [approvalHash, failure, index, isApprovalPending, signs]
  )

  const clearFailure = () => setSignFailure(undefined)

  const onSubmit = async (hash: string) => {
    clearFailure()
    if (request.data?.signs !== "approval" || index === null) return
    setSentApproval({ leg: index, value: hash as Hex })
    setIsApprovalPending(true)
    await waitForApproval(request.data.tx, hash as Hex)
    await request.refetch()
    setIsApprovalPending(false)
  }

  const onError = (cause: unknown) => {
    setRejectedSubmissions((count) => count + 1)
    if (index !== null)
      setSignFailure({ leg: index, value: getErrorMessage(cause, t("Failed to submit")) })
    request.refetch()
  }

  const onPayloadLockChange = (isLocked: boolean) => {
    if (isLocked) clearFailure()
    else request.refetch()
  }

  return {
    signing,
    ethTx: request.data ? ethTx : undefined,
    built: request.data?.signs === "leg" ? request.data.built : undefined,
    feeTokenId: request.data ? evmNativeTokenId(request.data.tx.networkId) : undefined,
    blockingError: ethTx.error,
    button: {
      request: request.data,
      tx,
      signerType: plan && index !== null ? plan.legs[index].signerType : undefined,
      isBuildFailed: request.isError,
      isRetry: !!failure,
      isApprovalPending,
      rejectedSubmissions,
      rebuild: () => request.refetch(),
      onSubmit,
      onError,
      onPayloadLockChange,
    },
  }
}

export type PlanLegSigningState = ReturnType<typeof usePlanLegSigning>

export const PlanLegSignButton: FC<{
  button: PlanLegSigningState["button"]
  containerId?: string
}> = ({ button, containerId }) => {
  const { t } = useTranslation()
  const { request, tx, signerType } = button

  if (button.isBuildFailed)
    return (
      <Button color="orange" fullWidth onClick={button.rebuild}>
        {t("Try again")}
      </Button>
    )

  if (!request)
    return (
      <Button primary fullWidth processing>
        {t("Processing")}
      </Button>
    )

  const label =
    request.signs === "approval"
      ? request.step === "revoke"
        ? t("Revoke Approval")
        : t("Approve {{symbol}}", { symbol: request.symbol })
      : signerType?.startsWith("ledger-")
        ? t("Sign on Ledger")
        : t("Sign")

  return (
    <SwapTxSubmitButton
      key={button.rejectedSubmissions}
      containerId={containerId}
      tx={tx}
      label={label}
      isRetry={button.isRetry}
      isFinalStep={request?.signs !== "approval"}
      isProcessing={button.isApprovalPending}
      onSubmit={button.onSubmit}
      onError={button.onError}
      onPayloadLockChange={button.onPayloadLockChange}
      disabled={!tx}
    />
  )
}
