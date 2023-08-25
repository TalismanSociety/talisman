import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { AlertTriangleIcon } from "@talisman/theme/icons"
import { provideContext } from "@talisman/util/provideContext"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { Mnemonic } from "@ui/domains/Mnemonic/Mnemonic"
import { MnemonicUnlock, useMnemonicUnlock } from "@ui/domains/Mnemonic/MnemonicUnlock"
import { Mnemonic as MnemonicInfo, useMnemonic, useMnemonics } from "@ui/hooks/useMnemonics"
import { ChangeEventHandler, FC, useCallback, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Checkbox, ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"

const Description = () => {
  const { t } = useTranslation("admin")
  return (
    <div className="text-body-secondary text-sm">
      <p>
        {t(
          "Your recovery phrase gives you access to your wallet and funds. It can be used to restore your Talisman created accounts if you lose access to your device, or forget your password."
        )}
      </p>
      <p className="mt-[1em]">
        <Trans
          t={t}
          components={{
            Link: (
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              <a
                href="https://docs.talisman.xyz/talisman/navigating-the-paraverse/account-management/back-up-your-secret-phrase"
                target="_blank"
                className="text-body opacity-100"
              ></a>
            ),
          }}
          defaults="We strongly encourage you to back up your recovery phrase by writing it down and storing
          it in a secure location. <Link>Learn more</Link>"
        ></Trans>
      </p>
    </div>
  )
}

const MnemonicFormInner = ({ mnemonicId }: { mnemonicId: string }) => {
  const { t } = useTranslation()
  const { mnemonic: secret } = useMnemonicUnlock()
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

  return (
    <div className="flex grow flex-col">
      <Mnemonic onReveal={handleMnemonicReveal} mnemonic={secret ?? ""} />
      <div className="bg-grey-750 text-alert-warn mt-8 flex w-full items-center gap-6 rounded-sm p-4">
        <div className="bg-alert-warn/10 flex flex-col justify-center rounded-full p-2">
          <AlertTriangleIcon className="shrink-0 text-base" />
        </div>
        <div className="text-xs">
          <p>
            {t(
              "Never share your recovery phrase with anyone or enter your recovery phrase in any website. Talisman will never ask you to do it."
            )}
          </p>
        </div>
      </div>
      <div className="mt-6 p-4">
        <Checkbox
          disabled={!canConfirm}
          onChange={handleConfirmToggle}
          checked={mnemonic?.confirmed}
          className="text-body-secondary hover:text-body gap-8!"
        >
          {t("I have backed up my recovery phrase")}
        </Checkbox>
      </div>
    </div>
  )
}

const MnemonicBackupForm: FC<{
  mnemonic: MnemonicInfo
}> = ({ mnemonic }) => {
  const { t } = useTranslation("admin")
  return (
    <div className={classNames("flex flex-col gap-12")}>
      <Description />
      <div className="min-h-[18.6rem] grow">
        <MnemonicUnlock
          mnemonicId={mnemonic.id}
          className="flex h-[18.6rem] w-full flex-col justify-between"
          buttonText={t("View Recovery Phrase")}
          title={
            <div className="text-body mb-10">
              {t("Enter your password to show your recovery phrase.")}
            </div>
          }
        >
          <MnemonicFormInner mnemonicId={mnemonic.id} />
        </MnemonicUnlock>
      </div>
    </div>
  )
}

const useMnemonicBackupModalProvider = () => {
  const mnemonics = useMnemonics()
  const [mnemonicId, setMnemonicId] = useState<string>()
  const mnemonic = useMnemonic(mnemonicId)

  const { isOpen, open: innerOpen, close } = useOpenClose()

  const open = useCallback(
    (mnemonicId?: string) => {
      setMnemonicId(mnemonicId)
      innerOpen()
    },
    [innerOpen]
  )

  const isBackupConfirmed = useCallback(
    (mnemonicId: string) => {
      const mnemonic = mnemonics.find((m) => m.id === mnemonicId)
      return !!mnemonic?.confirmed
    },
    [mnemonics]
  )

  return {
    mnemonic,
    isOpen,
    open,
    close,
    isBackupConfirmed,
  }
}

export const [MnemonicBackupModalProvider, useMnemonicBackupModal] = provideContext(
  useMnemonicBackupModalProvider
)

export const MnemonicBackupModal = () => {
  const { t } = useTranslation("admin")
  const { mnemonic, close, isOpen } = useMnemonicBackupModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog className="!w-[64rem]" title={t("Backup recovery phrase")} onClose={close}>
        {!!mnemonic && <MnemonicBackupForm mnemonic={mnemonic} />}
      </ModalDialog>
    </Modal>
  )
}
