import { yieldIdForAnalytics } from "@common/analytics/staking"
import type { BalanceDto, PendingActionDto } from "@core/domains/earn/exports"
import { isAccountOwned } from "@core/domains/keyring/exports"
import { api } from "@ui/api"
import { flows, useFlow } from "@ui/hooks/analytics/flows"
import { useAccountByAddress } from "@ui/state/accounts"
import { useNetworkById } from "@ui/state/chaindata"
import type { YieldxyzPositionEnhanced } from "@ui/state/yieldxyz"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { valueReport } from "../../../Staking/shared/stakingAnalytics"
import { useYieldxyzPendingAction } from "../hooks/useYieldxyzPendingAction"
import { useYieldxyzTransactionManager } from "../hooks/useYieldxyzTransactionManager"
import { useYieldxyzManageModal } from "./useYieldxyzManageModal"

export type YieldxyzManageWizardInputs = {
  position: YieldxyzPositionEnhanced
  pendingAction: PendingActionDto
  balance?: BalanceDto | null
}

const useYieldxyzManageWizardProvider = ({
  position,
  pendingAction,
  balance,
}: {
  position: YieldxyzPositionEnhanced | null | undefined
  pendingAction: PendingActionDto | null | undefined
  balance: BalanceDto | null | undefined
}) => {
  const { close, isOpen } = useYieldxyzManageModal()

  const account = useAccountByAddress(position?.address)
  const network = useNetworkById(position?.networkId)

  const isOwned = useMemo(() => isAccountOwned(account), [account])

  const {
    canCreateAction,
    action, // ⚠️ action.transactions order changes over time, make sure to sort it based on stepIndex
    isLoading: isLoadingAction,
    error: errorAction,
    createAction,
    refreshAction,
    submitActionTransaction,
  } = useYieldxyzPendingAction({
    address: position?.address,
    yieldId: position?.yieldId,
    pendingAction: isOwned ? pendingAction : undefined,
  })

  const refInitialized = useRef(false)
  const retryCreateAction = useCallback(() => {
    refInitialized.current = true
    createAction().catch(() => {
      refInitialized.current = false // Allow retry
    })
  }, [createAction])

  useEffect(() => {
    // create the action on load, only once
    if (canCreateAction && !refInitialized.current) retryCreateAction()
  }, [canCreateAction, retryCreateAction])

  const onCompleted = useCallback(() => {
    // do not await the refresh or UI will flicker
    if (position) api.yieldxyzPositionRefresh(position)
    if (isOpen) {
      flows.earn_manage.completed()
      close()
    }
  }, [close, isOpen, position])

  useFlow(flows.earn_manage, {
    active: isOpen && !!position && !!pendingAction,
    attributes: { earn_action: pendingAction?.type.toLowerCase() ?? "unknown" },
    step: action ? "confirm" : "prepare",
  })

  const refSent = useRef(false)
  const onTransactionSent = useCallback(() => {
    if (refSent.current) return
    refSent.current = true
    const report = valueReport({
      account,
      network,
      symbol: balance?.token.symbol ?? position?.product.token.symbol,
      usd: balance?.amountUsd ? Number(balance.amountUsd) : null,
    })
    if (report)
      flows.earn_manage.submitted({ ...report, yield_id: yieldIdForAnalytics(position?.yieldId) })
  }, [account, network, balance, position])

  const { stepIndex, transaction, isProcessing, onSubmit, onSubmitError } =
    useYieldxyzTransactionManager({
      action,
      address: position?.address,
      networkId: position?.networkId,
      maxNativeValue: 0n,
      refreshAction,
      submitActionTransaction,
      onCompleted,
      onTransactionSent,
      onTransactionFailed: flows.earn_manage.failed,
    })

  return {
    position,
    balance,
    pendingAction,
    network,
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
    retryCreateAction,
  }
}

export const [YieldxyzManageWizardProvider, useYieldxyzManageWizard] = provideContext(
  useYieldxyzManageWizardProvider
)
