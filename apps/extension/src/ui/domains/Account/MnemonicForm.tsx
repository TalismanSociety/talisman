import { AlertTriangleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useSensitiveState } from "@ui/hooks/useSensitiveState"
import { FC, useEffect } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Toggle } from "talisman-ui"

import { Mnemonic } from "./Mnemonic"
import { PasswordUnlock, usePasswordUnlock } from "./PasswordUnlock"

const Description = () => {
  const { t } = useTranslation()
  return (
    <div className="text-body-secondary my-6 text-sm">
      <Trans t={t}>
        <p>
          Your recovery phrase gives you access to your wallet and funds. It can be used to restore
          your Talisman created accounts if you lose access to your device, or forget your password.
        </p>
        <p className="mt-[1em]">
          We strongly encourage you to back up your recovery phrase by writing it down and storing
          it in a secure location.{" "}
          <a
            href="https://docs.talisman.xyz/talisman/navigating-the-paraverse/account-management/back-up-your-secret-phrase"
            target="_blank"
            className="text-body opacity-100"
          >
            Learn more.
          </a>
        </p>
        <div className="bg-grey-750 text-alert-warn mt-12 flex w-full items-center gap-8 rounded p-8">
          <AlertTriangleIcon className="shrink-0 text-xl" />
          <ul>
            <Trans t={t}>
              <li>Never share your recovery phrase with anyone.</li>
              <li>Never enter your recovery phrase in any website.</li>
              <li>Talisman will never ask you for it.</li>
            </Trans>
          </ul>
        </div>
      </Trans>
    </div>
  )
}

const MnemonicFormInner = () => {
  const { t } = useTranslation()
  const { isConfirmed, toggleConfirmed } = useMnemonicBackup()
  const [mnemonic, setMnemonic] = useSensitiveState<string>()
  const { password } = usePasswordUnlock()

  useEffect(() => {
    if (!password) return
    api.mnemonicUnlock(password).then(setMnemonic)
  }, [password, setMnemonic])

  return (
    <div className="flex grow flex-col">
      {mnemonic ? (
        <>
          <Mnemonic mnemonic={mnemonic} />
          <div className="grow"></div>
          <div className="flex w-full items-center justify-end gap-2">
            <div className="text-body-secondary text-sm">{t("Don't remind me again")}</div>
            <Toggle checked={isConfirmed} onChange={(e) => toggleConfirmed(e.target.checked)} />
          </div>
        </>
      ) : (
        <div className="bg-grey-800 mt-[32.8px] h-72 w-full animate-pulse rounded"></div>
      )}
    </div>
  )
}

export const MnemonicForm: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  return (
    <div className={classNames("flex h-[47rem] flex-col", className)}>
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
        <MnemonicFormInner />
      </PasswordUnlock>
    </div>
  )
}
