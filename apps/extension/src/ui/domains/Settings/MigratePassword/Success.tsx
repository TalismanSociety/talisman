import { ModalDialog } from "@talisman/components/ModalDialog"
import StatusIcon from "@talisman/components/StatusIcon"
import { Button } from "talisman-ui"
import { useMigratePassword } from "./context"

export const MigratePasswordSuccess = () => {
  const { onComplete } = useMigratePassword()
  return (
    <ModalDialog title="Your password has been updated">
      <StatusIcon status="SUCCESS" />
      <Button onClick={onComplete} fullWidth>
        Close
      </Button>
    </ModalDialog>
  )
}
