import { StatusIcon } from "@talisman/components/StatusIcon"
import { useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Button } from "talisman-ui"

import { useFix119MigrationError } from "./context"

export const Fix119MigrationErrorSuccess = () => {
  const { t } = useTranslation()
  const { onComplete } = useFix119MigrationError()
  return (
    <ModalDialog title={t("Success")}>
      <StatusIcon status="SUCCESS" className="my-20" />
      <Button onClick={onComplete} fullWidth>
        {t("Close")}
      </Button>
    </ModalDialog>
  )
}
