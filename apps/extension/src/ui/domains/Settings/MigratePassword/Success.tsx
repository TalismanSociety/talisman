import { ModalDialog } from "@talisman/components/ModalDialog"
import StatusIcon from "@talisman/components/StatusIcon"
import { Button } from "talisman-ui"

import { useMigratePassword } from "./context"

export const MigratePasswordSuccess = () => {
  const { onComplete } = useMigratePassword()
  return (
    <ModalDialog title="Security Upgrade Complete">
      <StatusIcon status="SUCCESS" className="my-20" />
      <Button onClick={onComplete} fullWidth>
        Close
      </Button>
    </ModalDialog>
  )
}
