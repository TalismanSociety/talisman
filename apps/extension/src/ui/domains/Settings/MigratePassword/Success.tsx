import { ModalDialog } from "@talisman/components/ModalDialog"
import StatusIcon from "@talisman/components/StatusIcon"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { useMigratePassword } from "./context"

export const MigratePasswordSuccess = () => {
  const { t } = useTranslation("settings")
  const { onComplete } = useMigratePassword()
  return (
    <ModalDialog title={t("Security Upgrade Complete")}>
      <StatusIcon status="SUCCESS" className="my-20" />
      <Button onClick={onComplete} fullWidth>
        {t("Close")}
      </Button>
    </ModalDialog>
  )
}
