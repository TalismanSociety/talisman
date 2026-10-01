import { AlertTriangleIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { DrawerContent } from "@ui/components/DrawerContent"
import { useTranslation } from "react-i18next"

export const RootStakedTaoWarningDrawer = ({
  isOpen,
  close,
  handleAccept,
}: {
  isOpen: boolean
  close: () => void
  handleAccept: () => void
}) => {
  const { t } = useTranslation()

  return (
    <Drawer anchor="bottom" isOpen={isOpen} onDismiss={close} containerId="main">
      <DrawerContent className="gap flex flex-col items-center text-center">
        <div className="flex size-24 items-center justify-center rounded-full bg-alert-warn/10">
          <AlertTriangleIcon className="inline-block size-12 text-alert-warn" />
        </div>
        <div className="mt-6 font-bold text-md">{t("Do Not Send to Exchange")}</div>
        <div className="mt-5 text-body-secondary text-sm leading-paragraph">
          {t(
            "You are sending Root Staked TAO. Ensure you are not sending to a centralized exchange."
          )}
        </div>
        <div className="mt-10 grid w-full grid-cols-2 gap-8">
          <Button onClick={close}>{t("Cancel")}</Button>
          <Button onClick={handleAccept} color="orange">
            {t("Proceed")}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
