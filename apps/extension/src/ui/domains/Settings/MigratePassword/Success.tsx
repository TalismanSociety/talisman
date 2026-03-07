import { Button } from "@ui/talisman-ui/components/Button"
import { ModalDialog } from "@ui/talisman-ui/components/ModalDialog"
import { ProcessAnimation } from "@ui/talisman-ui/components/ProcessAnimation/ProcessAnimation"
import { useTranslation } from "react-i18next"

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
