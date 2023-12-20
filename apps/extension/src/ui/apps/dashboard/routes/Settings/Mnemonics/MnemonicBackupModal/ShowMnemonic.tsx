import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { Mnemonic } from "@ui/domains/Mnemonic/Mnemonic"
import { MnemonicUnlock, useMnemonicUnlock } from "@ui/domains/Mnemonic/MnemonicUnlock"
import { useMnemonic } from "@ui/hooks/useMnemonics"
import { t } from "i18next"
import { ChangeEventHandler, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Checkbox } from "talisman-ui"

import { Stages, useMnemonicBackupModal } from "./context"
import { TitleComponent } from "./types"

const MnemonicFormInner = ({ mnemonicId }: { mnemonicId: string }) => {
  const { t } = useTranslation()
  const { mnemonic: secret } = useMnemonicUnlock()
  const { setStage } = useMnemonicBackupModal()
  const mnemonic = useMnemonic(mnemonicId)
  const [canConfirm, setCanConfirm] = useState(() => mnemonic?.confirmed)

  const handleConfirmToggle: ChangeEventHandler<HTMLInputElement> = useCallback(
    async (e) => {
      try {
        if (!mnemonic) return
        await api.mnemonicConfirm(mnemonic.id, e.target.checked)
      } catch (err) {
        notify({
          type: "error",
          title: t("Failed to change status"),
          subtitle: (err as Error)?.message ?? "",
        })
      }
    },
    [mnemonic, t]
  )

  const handleMnemonicReveal = useCallback(() => {
    setCanConfirm(true)
  }, [])

  const handleVerifyClick = useCallback(() => {
    setStage(Stages.Verify)
  }, [setStage])

  return (
    <div className="flex flex-col gap-4">
      <span className="text-body-secondary text-sm">
        Only reveal your recovery phrase when in a secure location
      </span>
      <div className="flex flex-col gap-16">
        <Mnemonic onReveal={handleMnemonicReveal} mnemonic={secret ?? ""} />
        <div className="flex flex-col gap-8">
          <Checkbox
            disabled={!canConfirm}
            onChange={handleConfirmToggle}
            checked={mnemonic?.confirmed}
            className="text-body-secondary hover:text-body gap-8!"
          >
            {t("I have backed up my recovery phrase, don't remind me again")}
          </Checkbox>
          <Button primary onClick={handleVerifyClick}>
            {t("Verify my recovery phrase")}
          </Button>
        </div>
      </div>
    </div>
  )
}

export const ShowMnemonic: TitleComponent = () => {
  const { t } = useTranslation("admin")
  const { mnemonic } = useMnemonicBackupModal()

  if (!mnemonic) return <>No mnemonic available</>

  return (
    <div className="min-h-[18.6rem] grow">
      <MnemonicUnlock
        mnemonicId={mnemonic.id}
        className="flex w-full flex-col justify-between gap-8"
        buttonText={t("View Recovery Phrase")}
        title={
          <div className="text-body-secondary">
            {t("Enter your password to show your recovery phrase.")}
          </div>
        }
      >
        <MnemonicFormInner mnemonicId={mnemonic.id} />
      </MnemonicUnlock>
    </div>
  )
}

ShowMnemonic.title = t("Backup Recovery Phrase")
