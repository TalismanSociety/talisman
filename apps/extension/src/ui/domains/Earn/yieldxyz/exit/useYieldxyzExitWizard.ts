import type { ErrorCategory } from "@common/analytics/errorCategory"
import { yieldIdForAnalytics } from "@common/analytics/staking"
import { log } from "@common/log"
import { isAccountOwned } from "@core/domains/keyring/exports"
import { planckToTokens } from "@talismn/util"
import { api } from "@ui/api"
import { flows, useFlow } from "@ui/hooks/analytics/flows"
import { useAccountByAddress } from "@ui/state/accounts"
import { useNetworkById } from "@ui/state/chaindata"
import type { YieldxyzPositionEnhanced } from "@ui/state/yieldxyz"
import { provideContext } from "@ui/util/provideContext"
import { isEqual } from "lodash-es"
import { useCallback, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { valueReport } from "../../../Staking/shared/stakingAnalytics"
import { useYieldxyzAction } from "../hooks/useYieldxyzAction"
import { useYieldxyzActionValidation } from "../hooks/useYieldxyzActionValidation"
import { useYieldxyzTransactionManager } from "../hooks/useYieldxyzTransactionManager"
import { useYieldxyzExitModal } from "./useYieldxyzExitModal"

export type YieldxyzExitWizardInit = YieldxyzPositionEnhanced

export type YieldxyzExitWizardState = {
  step: "amount" | "confirm"
  position: YieldxyzExitWizardInit | null
  amountOut: bigint | null
}

const useYieldxyzExitWizardProvider = ({
  position,
}: {
  position: YieldxyzPositionEnhanced | null
}) => {
  const { t } = useTranslation()
  const { close, isOpen } = useYieldxyzExitModal()
  const [state, setState] = useState<YieldxyzExitWizardState>(() => {
    const balance = position ? getExitableBalance(position) : undefined
    return {
      step: "amount",
      position,
      amountOut: balance?.amountRaw ? BigInt(balance.amountRaw) : null,
    }
  })

  const account = useAccountByAddress(position?.address)
  const network = useNetworkById(state.position?.networkId)

  const balance = useMemo(() => getExitableBalance(state.position), [state.position])

  const [inputs, talismanValidationError] = useMemo(() => {
    if (!state.amountOut || !position?.product.token || !balance) return [null, null]
    if (!isAccountOwned(account))
      return [
        null,
        {
          message: t("Unable to transact with external accounts"),
          category: "unsupported" as const,
        },
      ]
    if (state.amountOut > BigInt(balance.amountRaw))
      return [
        null,
        { message: t("Insufficient balance"), category: "insufficient_balance" as const },
      ]

    const inputs = {
      amount: planckToTokens(state.amountOut.toString(), balance.token.decimals),
      // ⚠️ on products that do not support useMaxAmount, if rewards are per block, we will always leave some dust in the vault.
      useMaxAmount: state.amountOut === BigInt(balance.amountRaw),
    }
    return [inputs, null]
  }, [state.amountOut, position?.product.token, balance, account, t])

  const validationErrorCategory: ErrorCategory =
    talismanValidationError?.category ?? "input_invalid"

  const { args, error: yieldxyzValidationError } = useYieldxyzActionValidation({
    schema: state.position?.product?.mechanics.arguments?.exit,
    inputs,
  })

  const {
    canCreateAction,
    action, // ⚠️ action.transactions order changes over time, make sure to sort it based on stepIndex
    isLoading: isLoadingAction,
    error: errorAction,
    createAction,
    refreshAction,
    submitActionTransaction,
  } = useYieldxyzAction({
    type: "exit",
    address: state.position?.address,
    yieldId: state.position?.yieldId,
    args,
  })

  const onAmountOutChanged = useCallback((amountOut: bigint | null) => {
    setState((state) => ({ ...state, amountOut }))
  }, [])

  const goTo = useCallback((step: YieldxyzExitWizardState["step"]) => {
    setState((state) => ({ ...state, step }))
  }, [])

  const onCompleted = useCallback(() => {
    // do not await the refresh or UI will flicker
    if (state.position) api.yieldxyzPositionRefresh(state.position)
    if (isOpen) {
      flows.earn_withdraw.completed()
      close()
    }
  }, [close, isOpen, state.position])

  useFlow(flows.earn_withdraw, { active: isOpen && !!position, step: state.step })

  const refSent = useRef(false)
  const onTransactionSent = useCallback(() => {
    if (refSent.current) return
    refSent.current = true
    const report = valueReport({
      account,
      network,
      symbol: balance?.token.symbol,
      usd: shareOfUsd(balance, state.amountOut),
    })
    if (report)
      flows.earn_withdraw.submitted({
        ...report,
        yield_id: yieldIdForAnalytics(state.position?.yieldId),
      })
  }, [account, network, balance, state.amountOut, state.position?.yieldId])

  const setMaxAmountOut = useCallback(() => {
    if (!balance) return
    setState((state) => ({ ...state, amountOut: BigInt(balance.amountRaw) }))
  }, [balance])

  const { stepIndex, transaction, isProcessing, onSubmit, onSubmitError } =
    useYieldxyzTransactionManager({
      action,
      address: state.position?.address,
      networkId: state.position?.networkId,
      maxNativeValue: 0n,
      refreshAction,
      submitActionTransaction,
      onCompleted,
      onTransactionSent,
      onTransactionFailed: flows.earn_withdraw.failed,
    })

  return {
    ...state,
    network,
    balance,
    validationError: talismanValidationError?.message ?? yieldxyzValidationError,
    validationErrorCategory,
    goTo,
    onAmountOutChanged,
    setMaxAmountOut,
    onSubmit,
    onSubmitError,
    isLoadingAction,
    isProcessing,
    action,
    errorAction,
    stepIndex,
    transaction,
    canCreateAction,
    createAction,
  }
}

export const [YieldxyzExitWizardProvider, useYieldxyzExitWizard] = provideContext(
  useYieldxyzExitWizardProvider
)

const getExitableBalance = (position: YieldxyzPositionEnhanced | null) => {
  const activeBalances = position?.balances.filter((b) => b.type === "active")
  if (!activeBalances?.length) return undefined
  if (activeBalances.length > 1) {
    // if one matches the main product token, prefer that one
    const mainTokenBalance = activeBalances.find((b) => isEqual(b.token, position?.product.token))
    if (mainTokenBalance) return mainTokenBalance

    log.warn("Position has multiple active balances, which is not supported", {
      position,
      activeBalances,
    })
    return undefined
  }

  return activeBalances[0]
}

const shareOfUsd = (
  balance: { amountUsd?: string | null; amountRaw: string } | undefined,
  amountOut: bigint | null
) => {
  if (!balance?.amountUsd || amountOut === null || BigInt(balance.amountRaw) === 0n) return null
  return (Number(balance.amountUsd) * Number(amountOut)) / Number(balance.amountRaw)
}
