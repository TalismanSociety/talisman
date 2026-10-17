import { db } from "@core/db"
import { planSteps } from "@core/domains/swaps/plans/helpers"
import type { SwapPlanId } from "@core/domains/swaps/plans/types"
import { LoaderIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { ProcessAnimation } from "@ui/components/ProcessAnimation/ProcessAnimation"
import { TransactionsStepper } from "@ui/components/TransactionsStepper"
import { cn } from "@ui/util/cn"
import { useLiveQuery } from "dexie-react-hooks"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSwapPlanSteps } from "./SwapPlanSteps"
import { getSwapPlanProgressDetails } from "./swapPlanProgressStatus"

const usePlan = (id: SwapPlanId) =>
  useLiveQuery(async () => (await db.swapPlans.get(id)) ?? null, [id])

const useRow = (hash: string | null) =>
  useLiveQuery(async () => (hash ? ((await db.transactionsV2.get(hash)) ?? null) : null), [hash])

export const SwapPlanProgress: FC<{ id: SwapPlanId; onClose: () => void }> = ({ id, onClose }) => {
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
        <Button primary fullWidth onClick={onClose}>
          {t("Close")}
        </Button>
      </div>
    </div>
  )
}
