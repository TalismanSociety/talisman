import { planckToTokens } from "@talismn/util"
import { isAccountOwned } from "extension-core"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useAccountByAddress, useNetworkById, YieldxyzPositionEnhanced } from "@ui/state"

import { useYieldxyzAction } from "../hooks/useYieldxyzAction"
import { useYieldxyzTransactionManager } from "../hooks/useYieldxyzActionManager"
import { useYieldxyzActionValidation } from "../hooks/useYieldxyzActionValidation"
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
    if (!isAccountOwned(account)) return [null, t("Unable to transact with external accounts")]
    if (state.amountOut > BigInt(balance.amountRaw)) return [null, t("Insufficient balance")]

    const inputs = {
      amount: planckToTokens(state.amountOut.toString(), balance.token.decimals),
      // ⚠️ on products that do not support useMaxAmount, if rewards are per block, we will always leave some dust in the vault.
      useMaxAmount: state.amountOut === BigInt(balance.amountRaw),
    }
    return [inputs, null]
  }, [state.amountOut, position?.product.token, balance, account, t])

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
    if (isOpen) close()
  }, [close, isOpen, state.position])

  const setMaxAmountOut = useCallback(() => {
    if (!balance) return
    setState((state) => ({ ...state, amountOut: BigInt(balance.amountRaw) }))
  }, [balance])

  const { stepIndex, transaction, isProcessing, onSubmit } = useYieldxyzTransactionManager({
    action,
    address: state.position?.address,
    networkId: state.position?.networkId,
    refreshAction,
    submitActionTransaction,
    onCompleted,
  })

  return {
    ...state,
    network,
    balance,
    validationError: talismanValidationError ?? yieldxyzValidationError,
    goTo,
    onAmountOutChanged,
    setMaxAmountOut,
    onSubmit,
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
  useYieldxyzExitWizardProvider,
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
