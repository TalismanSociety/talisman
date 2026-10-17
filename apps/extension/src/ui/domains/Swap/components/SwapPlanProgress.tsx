import { db } from "@core/db"
import { planCallToAction, planSteps } from "@core/domains/swaps/plans/helpers"
import type { SwapPlan, SwapPlanId } from "@core/domains/swaps/plans/types"
import { LoaderIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { ProcessAnimation } from "@ui/components/ProcessAnimation/ProcessAnimation"
import { TransactionsStepper } from "@ui/components/TransactionsStepper"
import { cn } from "@ui/util/cn"
import { useLiveQuery } from "dexie-react-hooks"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useSwapModal } from "../hooks/useSwapModal"
import { SwapPlanLedgerSign } from "./SwapPlanLedgerSign"
import { useSwapPlanSteps } from "./SwapPlanSteps"
import { getSwapPlanProgressDetails } from "./swapPlanProgressStatus"

const usePlan = (id: SwapPlanId) =>
  useLiveQuery(async () => (await db.swapPlans.get(id)) ?? null, [id])

const useRow = (hash: string | null) =>
  useLiveQuery(async () => (hash ? ((await db.transactionsV2.get(hash)) ?? null) : null), [hash])

const SwapPlanAction: FC<{ plan: SwapPlan; onClose: () => void; containerId?: string }> = ({
  plan,
  onClose,
  containerId,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { open: openSwapModal } = useSwapModal()
  const action = useMemo(() => planCallToAction(plan), [plan])

  const checkActivity = useCallback(() => {
    onClose()
    navigate("/tx-history")
  }, [navigate, onClose])

  switch (action.type) {
    case "unlock":
      return (
        <Button primary fullWidth onClick={() => api.promptLogin()}>
          {t("Unlock")}
        </Button>
      )
    case "sign-hardware":
      return <SwapPlanLedgerSign plan={plan} leg={action.leg} containerId={containerId} />
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
  const plan = usePlan(id)

  const states = useMemo(() => (plan ? planSteps(plan) : []), [plan])
  const legs = useMemo(() => plan?.legs.map((leg) => leg.quote) ?? [], [plan])
  const steps = useSwapPlanSteps(legs, states)
  const lastLegRow = useRow(states.at(-1)?.hash ?? null)

  const { title, subtitle, animStatus, pillLabel } = getSwapPlanProgressDetails(t, plan, lastLegRow)

  return (
    <div className="flex h-full w-full flex-col items-center overflow-hidden p-12">
      <div className="mt-8 font-bold text-body text-lg">{title}</div>
      <div className="mt-12 text-center font-light text-base text-body-secondary">{subtitle}</div>
      <ProcessAnimation status={animStatus} className="mt-16 mb-8 h-36.25" />
      <div className="flex w-full grow flex-col items-center justify-center gap-8 text-center text-body-secondary">
        <TransactionsStepper steps={steps} />
        <div
          className={cn(
            "inline-flex items-center gap-3 rounded-full bg-grey-800 p-4 text-primary text-xs",
            !pillLabel && "invisible"
          )}
        >
          <LoaderIcon className="animate-spin-slow text-sm" />
          <span>{pillLabel}</span>
        </div>
      </div>
      <div className="flex w-full flex-col gap-4 pt-6">
        {plan ? <SwapPlanAction plan={plan} onClose={onClose} containerId={containerId} /> : null}
        <Button fullWidth onClick={onClose}>
          {t("Close")}
        </Button>
      </div>
    </div>
  )
}
