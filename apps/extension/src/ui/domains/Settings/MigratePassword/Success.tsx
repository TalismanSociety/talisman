import { Button } from "@ui/components/Button"
import { ProcessAnimation } from "@ui/components/ProcessAnimation/ProcessAnimation"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { useTranslation } from "react-i18next"

import { useMigratePassword } from "./context"

export const MigratePasswordSuccess = () => {
  const { t } = useTranslation()
  const { onComplete } = useMigratePassword()
  return (
    <WizardModalDialog className="h-auto" title={t("Security Upgrade Complete")}>
      <ProcessAnimation status="success" className="my-20 h-35" />
      <Button onClick={onComplete} fullWidth>
        {t("Close")}
      </Button>
    </WizardModalDialog>
  )
}
