import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { Mnemonic } from "@ui/domains/Mnemonic/Mnemonic"
import { useMnemonicUnlock } from "@ui/domains/Mnemonic/MnemonicUnlock"
import { useMnemonic } from "@ui/hooks/useMnemonics"
import { ChangeEventHandler, FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Checkbox } from "talisman-ui"

import { useMnemonicBackupModal } from "../context"
import { ShowMnemonicProps } from "./types"

export const ViewMnemonic: FC<ShowMnemonicProps> = ({ mnemonicId, handleComplete }) => {
  const { t } = useTranslation()
  const { mnemonic } = useMnemonicUnlock()
  const mnemonicInfo = useMnemonic(mnemonicId)
  const { close } = useMnemonicBackupModal()
  const [canConfirm, setCanConfirm] = useState(() => mnemonicInfo?.confirmed)

  const handleConfirmToggle: ChangeEventHandler<HTMLInputElement> = useCallback(
    async (e) => {
      try {
        if (!mnemonicInfo) return
        await api.mnemonicConfirm(mnemonicInfo.id, e.target.checked)
      } catch (err) {
        notify({
          type: "error",
          title: t("Failed to change status"),
          subtitle: (err as Error)?.message ?? "",
        })
      }
    },
    [mnemonicInfo, t]
  )

  const handleMnemonicReveal = useCallback(() => {
    setCanConfirm(true)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <span className="text-body-secondary text-sm">
        {t("Only reveal your recovery phrase when in a secure location")}
      </span>
      <div className="flex flex-col gap-16">
        <Mnemonic onReveal={handleMnemonicReveal} mnemonic={mnemonic ?? ""} wideLayoutWhen24 />
        <div className="flex flex-col gap-8">
          <Checkbox
            disabled={!canConfirm}
            onChange={handleConfirmToggle}
            checked={mnemonicInfo?.confirmed}
            className="text-body-secondary hover:text-body gap-8!"
          >
            {t("I have backed up my recovery phrase, don't remind me again")}
          </Checkbox>
          <Button
            primary
            onClick={handleComplete}
            disabled={!mnemonicInfo?.confirmed || !canConfirm}
          >
            {t("Verify my recovery phrase")}
          </Button>
        </div>
      </div>
      <div
        className="text-body-secondary flex cursor-pointer gap-5 self-end text-sm"
        onClick={close}
        onKeyDown={close}
        role="button"
        tabIndex={0}
      >
        {t("Skip for now")}
      </div>
    </div>
  )
}
