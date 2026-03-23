import { AlertCircleIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

type SwapQuoteExpiredDrawerProps = {
  isOpen: boolean
  containerId: string
  onDismiss: () => void
}

export const SwapQuoteExpiredDrawer: FC<SwapQuoteExpiredDrawerProps> = ({
  isOpen,
  containerId,
  onDismiss,
}) => {
  const { t } = useTranslation()

  return (
    <Drawer anchor="bottom" isOpen={isOpen} containerId={containerId} onDismiss={onDismiss}>
      <div className="flex w-full flex-col items-center gap-4 rounded-t-xl bg-grey-800 p-12">
        <AlertCircleIcon className="text-[1.875rem] text-alert-warn" />
        <div className="mt-4 text-center font-bold text-body">{t("Quote Expired")}</div>
        <p className="text-center text-body-secondary text-sm">
          {t(
            "Market conditions have changed since your quote was generated. Please go back and review the updated quote before confirming."
          )}
        </p>
        <Button className="mt-8 w-full" primary onClick={onDismiss}>
          {t("OK")}
        </Button>
      </div>
    </Drawer>
  )
}
