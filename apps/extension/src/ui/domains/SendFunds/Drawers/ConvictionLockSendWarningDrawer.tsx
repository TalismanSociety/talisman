import { AlertTriangleIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { useTranslation } from "react-i18next"

export const ConvictionLockSendWarningDrawer = ({
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
      <div className="flex flex-col items-center rounded-t-xl bg-black-tertiary p-12 text-center">
        <div className="flex size-24 items-center justify-center rounded-full bg-alert-warn/10">
          <AlertTriangleIcon className="inline-block size-12 text-alert-warn" />
        </div>
        <div className="mt-6 font-bold text-md">{t("Conviction lock will transfer")}</div>
        <div className="mt-5 text-body-secondary text-sm leading-paragraph">
          <p>
            {t(
              "This transfer includes conviction-locked stake. The lock and a share of its conviction move to the recipient, who cannot unstake that portion until the lock decays."
            )}
          </p>
          <p className="mt-5">
            {t(
              "The transfer will fail if the recipient hasn't opted in to receive locked stake, or already has a lock on a different hotkey for this subnet."
            )}
          </p>
        </div>
        <div className="mt-10 grid w-full grid-cols-2 gap-8">
          <Button onClick={close}>{t("Cancel")}</Button>
          <Button onClick={handleAccept} color="orange">
            {t("Proceed")}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
