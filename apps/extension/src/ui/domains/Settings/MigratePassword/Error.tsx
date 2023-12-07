import { useSetting } from "@ui/hooks/useSettings"
import { Trans, useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Button, Checkbox } from "talisman-ui"

import { useMigratePassword } from "./context"

export const MigratePasswordError = () => {
  const { t } = useTranslation()
  const { statusMessage, onComplete } = useMigratePassword()
  const [useErrorTracking, setUseErrorTracking] = useSetting("useErrorTracking")

  return (
    <ModalDialog title={t("There was a problem")}>
      <p className="text-body-secondary text-sm">
        <span className="block">
          {t("There was an error in updating your password.")}{" "}
          {useErrorTracking && (
            <span>{t("This error has been logged and our team wil look into it.")}</span>
          )}
          {!useErrorTracking && (
            <span>
              <Trans t={t}>
                Please opt in to error tracking to report the error below, or contact our support
                team on{" "}
                <a
                  className="text-white opacity-100"
                  href="https://discord.gg/talisman"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Discord
                </a>
                .
              </Trans>
            </span>
          )}
        </span>
      </p>
      <p className="text-body-secondary text-sm">
        {!useErrorTracking && (
          <span className="mb-4 block">
            <Checkbox onChange={() => setUseErrorTracking((prev) => !prev)}>
              {t("Send error report and enable error tracking")}
            </Checkbox>
          </span>
        )}
        <span className="text-body bg-body-secondary my-2 flex justify-center rounded-sm bg-opacity-50 p-4 font-mono">
          {statusMessage}
        </span>
      </p>
      <p className="text-body-secondary text-sm">
        {t(
          "The update was not completed, but you may continue to use Talisman. You will be asked to update again next time the extension is restarted."
        )}
        {useErrorTracking && (
          <Trans t={t}>
            If this problem continues, please contact our support team on{" "}
            <a
              className="text-white opacity-100"
              href="https://discord.gg/talisman"
              target="_blank"
              rel="noreferrer noopener"
            >
              Discord
            </a>
            .
          </Trans>
        )}
      </p>
      <Button
        fullWidth
        onClick={async () => {
          onComplete()
        }}
      >
        {t("Close")}
      </Button>
    </ModalDialog>
  )
}
