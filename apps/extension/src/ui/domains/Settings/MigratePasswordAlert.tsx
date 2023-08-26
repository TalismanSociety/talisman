import passwordStore from "@core/domains/app/store.password"
import { Card } from "@talisman/components/Card"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { LockIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { sendAnalyticsEvent } from "@ui/api/analytics"
import { useCallback, useEffect } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

type Props = {
  className?: string
  onAccept: () => void
  onReject: () => void
}

export const AlertCard = ({ className, onAccept, onReject }: Props) => {
  const { t } = useTranslation()
  return (
    <Card
      className={classNames("text-body-secondary !rounded-b-none text-center", className)}
      title={
        <div className="flex flex-col items-center p-2">
          <LockIcon className="icon text-primary inline-block p-1 text-3xl" />
          <div className="text-body mt-4">{t("Security Upgrade")}</div>
        </div>
      }
      description={
        <p className="text-sm">
          <Trans t={t}>
            We’re upgrading our security measures, including enhanced password encryption.{" "}
            <a
              href="https://medium.com/we-are-talisman/talismans-security-model-1e60391694c0"
              target="_blank"
              rel="noreferrer"
              className="text-body underline"
            >
              Learn more
            </a>{" "}
            about our new security features.
          </Trans>
        </p>
      }
      cta={
        <div className="flex w-full flex-col gap-5">
          <Button className="w-full" primary onClick={onAccept}>
            {t("Continue")}
          </Button>
          <Button className="w-full" onClick={onReject}>
            Not for now
          </Button>
        </div>
      }
    />
  )
}

const PasswordMigrationAlertPopupDrawer = () => {
  const { close, isOpen, setIsOpen } = useOpenClose()

  useEffect(() => {
    const sub = passwordStore.observable.subscribe(({ isHashed, ignorePasswordUpdate }) => {
      setIsOpen(!isHashed && !ignorePasswordUpdate)
    })
    return () => {
      sub.unsubscribe()
    }
  }, [setIsOpen])

  const handleReject = useCallback(async () => {
    // don't bug the user with repeated requests
    await passwordStore.set({ ignorePasswordUpdate: true })
    setIsOpen(false)
  }, [setIsOpen])

  const handleAccept = useCallback(() => {
    sendAnalyticsEvent({
      container: "Popup",
      feature: "Navigation",
      featureVersion: 3,
      page: "Portfolio",
      name: "Goto",
      action: "Migrate password button",
    })
    api.dashboardOpen("/settings/security-privacy-settings?showMigratePasswordModal")
    close()
  }, [close])

  return (
    <Drawer isOpen={isOpen} anchor="bottom">
      <AlertCard onAccept={handleAccept} onReject={handleReject} />
    </Drawer>
  )
}

// use default export to enable lazy loading
export default PasswordMigrationAlertPopupDrawer
