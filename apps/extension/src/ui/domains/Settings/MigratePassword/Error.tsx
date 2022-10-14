import { ModalDialog } from "@talisman/components/ModalDialog"
import { useSettings } from "@ui/hooks/useSettings"
import { useMigratePassword } from "./context"
import { Button, Checkbox } from "talisman-ui"

export const MigratePasswordError = () => {
  const { statusMessage, onComplete } = useMigratePassword()
  const { useErrorTracking, update } = useSettings()

  return (
    <ModalDialog title="There was a problem">
      <p className="text-body-secondary text-sm">
        <span className="block">
          There was an error in updating your password.{" "}
          {useErrorTracking && (
            <span>This error has been logged and our team wil look into it.</span>
          )}
          {!useErrorTracking && (
            <span>
              Please opt in to error tracking to report the error below, or contact our support team
              on{" "}
              <a
                className="text-white opacity-100"
                href="https://discord.gg/2EmmfrTN"
                target="_blank"
                rel="noreferrer"
              >
                Discord
              </a>
              .
            </span>
          )}
        </span>
      </p>
      <p className="text-body-secondary text-sm">
        {!useErrorTracking && (
          <span className="mb-4 block">
            <Checkbox onChange={() => update({ useErrorTracking: !useErrorTracking })}>
              Send error report and enable error tracking
            </Checkbox>
          </span>
        )}
        <span className="text-body bg-body-secondary my-2 flex justify-center rounded-sm bg-opacity-50 p-4 font-mono">
          {statusMessage}
        </span>
      </p>
      <p className="text-body-secondary text-sm">
        The update was not completed, but you may continue to use Talisman.
      </p>
      <Button fullWidth onClick={onComplete}>
        Close
      </Button>
    </ModalDialog>
  )
}
