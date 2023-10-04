import { Card } from "@talisman/components/Card"
import { LockIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

import { useFixBrokenMigrationModal } from "./useFixBrokenMigrationModal"

type Props = {
  className?: string
  onAccept: () => void
}

export const AlertCard = ({ className, onAccept }: Props) => {
  const { t } = useTranslation()
  return (
    <Card
      className={classNames("text-body-secondary !rounded-b-none text-center", className)}
      title={
        <div className="flex flex-col items-center p-2">
          <LockIcon className="icon text-primary inline-block p-1 text-3xl" />
          <div className="text-body mt-4">{t("Error Detected")}</div>
        </div>
      }
      description={
        <>
          <p className="text-sm">{t("We've detected an error in your Talisman wallet.")}</p>
          <p className="text-sm">
            {t(
              "Something went wrong in a recent upgrade. To fix the problem, you need to enter your password again."
            )}
          </p>
        </>
      }
      cta={
        <div className="flex w-full flex-col gap-5">
          <Button className="w-full" primary onClick={onAccept}>
            {t("Continue")}
          </Button>
        </div>
      }
    />
  )
}

const ErrorDetectedAlertPopupDrawer = () => {
  const { isOpen } = useFixBrokenMigrationModal()

  const handleAccept = useCallback(() => {
    api.dashboardOpen("/settings")
  }, [])

  return (
    <Drawer isOpen={isOpen} anchor="bottom">
      <AlertCard onAccept={handleAccept} />
    </Drawer>
  )
}

// use default export to enable lazy loading
export default ErrorDetectedAlertPopupDrawer
