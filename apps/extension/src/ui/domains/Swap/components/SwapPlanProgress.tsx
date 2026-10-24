import { db } from "@core/db"
import { planSteps } from "@core/domains/swaps/plans/helpers"
import type { SwapPlan, SwapPlanId } from "@core/domains/swaps/plans/types"
import type { WalletTransaction } from "@core/domains/transactions/types"
import { getErrorMessage } from "@talismn/util"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { ProcessAnimation } from "@ui/components/ProcessAnimation/ProcessAnimation"
import type { TxSubmitButtonTransaction } from "@ui/domains/Sign/TxSubmitButton/types"
import { useLiveQuery } from "dexie-react-hooks"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useSwapModal } from "../hooks/useSwapModal"
import { SwapPlanLedgerSign, useHardwareLegTransaction } from "./SwapPlanLedgerSign"
import { SwapPlanStepList, useStepRowContext } from "./SwapPlanStepList"
import {
  type SwapPlanFooterAction,
  swapPlanFooterAction,
  swapPlanProgressView,
} from "./swapPlanStepRows"

const usePlan = (id: SwapPlanId) =>
  useLiveQuery(async () => (await db.swapPlans.get(id)) ?? null, [id])

const useLegRows = (plan: SwapPlan | null | undefined) => {
  const hashes = useMemo(
    () => (plan ? planSteps(plan).flatMap((step) => (step.hash ? [step.hash] : [])) : []),
    [plan]
  )
  return useLiveQuery(
    async () => {
      const rows = await db.transactionsV2.bulkGet(hashes)
      return new Map(
        rows.flatMap((row): [string, WalletTransaction][] => (row ? [[row.id, row]] : []))
      )
    },
    [hashes],
    new Map<string, WalletTransaction>()
  )
}

const NO_ACTION: SwapPlanFooterAction = { type: "none" }

const SwapPlanAction: FC<{
  action: SwapPlanFooterAction
  ledgerTx: TxSubmitButtonTransaction | undefined
  onLedgerSignAttemptEnded: () => void
  onClose: () => void
  containerId?: string
}> = ({ action, ledgerTx, onLedgerSignAttemptEnded, onClose, containerId }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { open: openSwapModal } = useSwapModal()

  const checkActivity = useCallback(() => {
    onClose()
    navigate("/tx-history")
  }, [navigate, onClose])

  switch (action.type) {
    case "none":
      return null
    case "track":
      return (
        <Button primary fullWidth onClick={() => window.open(action.url, "_blank", "noopener")}>
          {t("Track swap progress")}
        </Button>
      )
    case "unlock":
      return (
        <Button primary fullWidth onClick={() => api.promptLogin()}>
          {t("Unlock")}
        </Button>
      )
    case "sign-hardware":
      return (
        <SwapPlanLedgerSign
          tx={ledgerTx}
          onSignAttemptEnded={onLedgerSignAttemptEnded}
          containerId={containerId}
        />
      )
    case "finish":
      return (
        <Button
          primary
          fullWidth
          onClick={() => openSwapModal({ entry: "swap_plan", ...action.offer })}
        >
          {t("Finish the swap")}
        </Button>
      )
    case "check-activity":
      return (
        <Button fullWidth onClick={checkActivity}>
          {t("Check activity")}
        </Button>
      )
  }
}

export const SwapPlanProgress: FC<{
  id: SwapPlanId
  onClose: () => void
  containerId?: string
}> = ({ id, onClose, containerId }) => {
  const { t } = useTranslation()
  const ctx = useStepRowContext()
  const plan = usePlan(id)
  const rows = useLegRows(plan)

  const action = useMemo(
    () => (plan ? swapPlanFooterAction({ plan, rows }) : NO_ACTION),
    [plan, rows]
  )
  const ledger = useHardwareLegTransaction(
    plan,
    action.type === "sign-hardware" ? action.leg : null
  )
  const ledgerError = ledger.error
    ? getErrorMessage(ledger.error, t("Failed to prepare the transaction"))
    : null

  const view = useMemo(
    () => (plan ? swapPlanProgressView(ctx, { plan, rows, ledgerError }) : null),
    [ctx, plan, rows, ledgerError]
  )

  return (
    <div className="flex h-full w-full flex-col items-center overflow-hidden p-12">
      <div className="mt-8 h-16 w-full shrink-0 truncate text-center font-bold text-body text-lg leading-[2rem]">
        {view?.title}
      </div>
      <div className="mt-6 line-clamp-2 h-20 w-full shrink-0 text-center font-light text-base text-body-secondary leading-10">
        {view?.subtitle}
      </div>
      <ProcessAnimation
        status={view?.animStatus ?? "processing"}
        className="mt-8 size-28 shrink-0"
      />
      <div className="flex min-h-0 w-full grow flex-col justify-center py-8">
        <SwapPlanStepList steps={view?.steps ?? []} />
      </div>
      <div className="flex w-full shrink-0 flex-col gap-4 pt-6">
        <div className="h-28 w-full">
          <SwapPlanAction
            action={action}
            ledgerTx={ledger.data}
            onLedgerSignAttemptEnded={ledger.refetch}
            onClose={onClose}
            containerId={containerId}
          />
        </div>
        <Button primary={action.type === "none"} fullWidth onClick={onClose}>
          {t("Close")}
        </Button>
      </div>
    </div>
  )
}
