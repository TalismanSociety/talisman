import { ShieldSuccessIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { useMnemonicBackupModal } from "./context"
import { MnemonicBackupModalBase } from "./MnemonicBackupModalBase"

export const Complete = () => {
  const { t } = useTranslation("admin")
  const { close } = useMnemonicBackupModal()

  return (
    <MnemonicBackupModalBase>
      <div className="!w-[56rem] flex-col gap-12">
        <div className="flex flex-col gap-4 rounded py-12">
          <div className="text-primary-700 flex flex-col items-center justify-center gap-8 self-stretch">
            <ShieldSuccessIcon className="h-20 w-16" />
            <span className="leading-paragraph text-center text-lg font-semibold">
              {t("Verification Successful")}
            </span>
          </div>
          <span className="text-body font-400 text-center leading-10">
            {t("Your recovery phrase has been verified.")}
          </span>
        </div>
      </div>
      <Button primary onClick={close} fullWidth>
        {t("Done")}
      </Button>
    </MnemonicBackupModalBase>
  )
}
