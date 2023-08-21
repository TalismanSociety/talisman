import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { AlertTriangleIcon } from "@talisman/theme/icons"
import { provideContext } from "@talisman/util/provideContext"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { Mnemonic } from "@ui/domains/Account/Mnemonic"
import { PasswordUnlock, usePasswordUnlock } from "@ui/domains/Account/PasswordUnlock"
import { useSensitiveState } from "@ui/hooks/useSensitiveState"
import { ChangeEventHandler, FC, useCallback, useEffect, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { ModalDialog, Toggle } from "talisman-ui"
import { Modal } from "talisman-ui"

import { Mnemonic as MnemonicInfo, useMnemonic, useMnemonics } from "./useMnemonics"

const Description = () => {
  const { t } = useTranslation("admin")
  return (
    <div className="text-body-secondary my-6 text-sm">
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
      <div className="bg-grey-750 text-alert-warn mt-12 flex w-full items-center gap-8 rounded p-8">
        <AlertTriangleIcon className="shrink-0 text-xl" />
        <ul>
          <Trans
            t={t}
            components={{ li: <li></li> }}
            defaults="<li>Never share your recovery phrase with anyone.</li><li>Never enter your recovery phrase in any website.</li><li>Talisman will never ask you for it.</li>"
          ></Trans>
        </ul>
      </div>
    </div>
  )
}

const MnemonicFormInner = ({ mnemonicId }: { mnemonicId: string }) => {
  const { t } = useTranslation()
  const { password } = usePasswordUnlock()
  const mnemonic = useMnemonic(mnemonicId)

  const [secret, setSecret] = useSensitiveState<string>()

  useEffect(() => {
    if (!password) return
    api.mnemonicUnlock(mnemonicId, password).then(setSecret)
  }, [password, setSecret, mnemonicId])

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

  return (
    <div className="flex grow flex-col">
      {mnemonic ? (
        <>
          <Mnemonic mnemonic={secret ?? ""} />
          <div className="grow"></div>
          <div className="flex w-full items-center justify-end gap-2">
            <div className="text-body-secondary text-sm">{t("Don't remind me again")}</div>
            <Toggle checked={mnemonic.confirmed} onChange={handleConfirmToggle} />
          </div>
        </>
      ) : (
        <div className="bg-grey-800 mt-[32.8px] h-72 w-full animate-pulse rounded"></div>
      )}
    </div>
  )
}

const MnemonicBackupForm: FC<{
  mnemonic: MnemonicInfo
}> = ({ mnemonic }) => {
  const { t } = useTranslation("admin")
  return (
    <div className={classNames("flex h-[47rem] flex-col")}>
      <Description />
      <PasswordUnlock
        className="flex w-full grow flex-col justify-center"
        buttonText={t("View Recovery Phrase")}
        title={
          <span className="mb-[-0.8rem] text-sm">
            {t("Enter your password to show your recovery phrase.")}
          </span>
        }
      >
        <MnemonicFormInner mnemonicId={mnemonic.id} />
      </PasswordUnlock>
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
      <ModalDialog className="!w-[50.3rem]" title={t("Backup recovery phrase")} onClose={close}>
        {!!mnemonic && <MnemonicBackupForm mnemonic={mnemonic} />}
      </ModalDialog>
    </Modal>
  )
}
