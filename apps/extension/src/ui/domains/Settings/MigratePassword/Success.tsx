import { useTranslation } from "react-i18next"
import { Button, ModalDialog, ProcessAnimation } from "talisman-ui"

import { useMigratePassword } from "./context"

export const MigratePasswordSuccess = () => {
  const { t } = useTranslation()
  const { onComplete } = useMigratePassword()
  return (
    <ModalDialog title={t("Security Upgrade Complete")}>
      <ProcessAnimation status="success" className="my-20 h-[14rem]" />
      <Button onClick={onComplete} fullWidth>
        {t("Close")}
      </Button>
    </ModalDialog>
  )
}
