import type { QuoteLeg } from "@core/domains/swaps/types"
import { ChevronRightIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { DrawerContent } from "@ui/components/DrawerContent"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SwapPlanStepList, useStepRowContext } from "./SwapPlanStepList"
import { quoteRouteSummary, quoteStepRows } from "./swapPlanStepRows"

export const SwapRouteRow: FC<{ legs: readonly QuoteLeg[]; containerId: string }> = ({
  legs,
  containerId,
}) => {
  const { t } = useTranslation()
  const ctx = useStepRowContext()
  const drawer = useOpenClose()
  const steps = useMemo(() => quoteStepRows(ctx, legs), [ctx, legs])

  return (
    <>
      <div className="flex h-11 items-center justify-between gap-8">
        <div className="whitespace-nowrap text-body-secondary text-xs">{t("Route")}</div>
        <button
          type="button"
          onClick={drawer.open}
          className="flex min-w-0 items-center gap-2 text-body text-xs"
        >
          <span className="truncate">{quoteRouteSummary(ctx, legs)}</span>
          <ChevronRightIcon className="shrink-0" />
        </button>
      </div>
      <Drawer
        analyticsId="swap_route"
        anchor="bottom"
        isOpen={drawer.isOpen}
        onDismiss={drawer.close}
        containerId={containerId}
      >
        <DrawerContent className="flex flex-col items-center gap-8">
          <div className="font-bold text-body">{t("Route")}</div>
          <SwapPlanStepList steps={steps} showStatus={false} />
          <Button fullWidth onClick={drawer.close}>
            {t("Close")}
          </Button>
        </DrawerContent>
      </Drawer>
    </>
  )
}
