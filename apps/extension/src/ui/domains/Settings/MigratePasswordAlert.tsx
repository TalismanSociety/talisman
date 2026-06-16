import { LockIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { sendAnalyticsEvent } from "@ui/api/analytics"
import { Button } from "@ui/components/Button"
import { Card } from "@ui/components/Card"
import { Drawer } from "@ui/components/Drawer"
import { cn } from "@ui/util/cn"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"

import { useMigratePasswordModal } from "../Settings/MigratePassword/useMigratePasswordModal"

type Props = {
  className?: string
  onAccept: () => void
}

const AlertCard = ({ className, onAccept }: Props) => {
  const { t } = useTranslation()
  return (
    <Card
      className={cn("rounded-b-none! text-center text-body-secondary", className)}
      title={
        <div className="flex flex-col items-center p-2">
          <LockIcon className="icon inline-block p-1 text-3xl text-primary" />
          <div className="mt-4 text-body">{t("Security Upgrade")}</div>
        </div>
      }
      description={
        <>
          <p className="text-sm">
            {t(
              "We’ve upgraded our security measures, including enhanced password encryption. You must upgrade now to continue using Talisman."
            )}
          </p>

          <p className="text-sm">
            <Trans t={t}>
              <a
                href="https://medium.com/we-are-talisman/talismans-security-model-1e60391694c0"
                target="_blank"
                rel="noreferrer noopener"
                className="text-body underline"
                aria-label="Learn more about Talisman's security model"
              >
                Learn more
              </a>{" "}
              about our new security features.
            </Trans>
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

const PasswordMigrationAlertPopupDrawer = () => {
  const { isOpen } = useMigratePasswordModal()

  const handleAccept = useCallback(() => {
    sendAnalyticsEvent({
      container: "Popup",
      feature: "Navigation",
      featureVersion: 3,
      page: "Portfolio",
      name: "Goto",
      action: "Migrate password button",
    })
    api.dashboardOpen("/settings")
  }, [])

  return (
    <Drawer isOpen={isOpen} anchor="bottom">
      <AlertCard onAccept={handleAccept} />
    </Drawer>
  )
}

// use default export to enable lazy loading
export default PasswordMigrationAlertPopupDrawer
