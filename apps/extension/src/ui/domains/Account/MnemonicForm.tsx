import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useSensitiveState } from "@ui/hooks/useSensitiveState"
import { useEffect } from "react"
import { Trans, useTranslation } from "react-i18next"
import styled from "styled-components"
import { Toggle } from "talisman-ui"

import { Mnemonic } from "./Mnemonic"
import { PasswordUnlock, usePasswordUnlock } from "./PasswordUnlock"

const Description = () => {
  const { t } = useTranslation()
  return (
    <div className="text-body-secondary text-md my-12">
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
      </Trans>
    </div>
  )
}

type MnemonicFormProps = {
  className?: string
}

const MnemonicForm = ({ className }: MnemonicFormProps) => {
  const { t } = useTranslation()
  const { isConfirmed, toggleConfirmed } = useMnemonicBackup()
  const [mnemonic, setMnemonic] = useSensitiveState<string>()
  const { password } = usePasswordUnlock()

  useEffect(() => {
    if (!password) return
    api.mnemonicUnlock(password).then(setMnemonic)
  }, [password, setMnemonic])

  return (
    <div className={classNames("flex grow flex-col", className)}>
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

const StyledMnemonicForm = styled(MnemonicForm)`
  .toggle {
    flex-direction: row;
    justify-content: flex-end;
  }
`

const WrappedMnemonicForm = ({ className }: MnemonicFormProps) => {
  const { t } = useTranslation()
  return (
    <div className={classNames("flex h-[50rem] flex-col", className)}>
      <Description />
      <PasswordUnlock
        className="flex w-full grow flex-col justify-center"
        buttonText={t("View Recovery Phrase")}
        title={t("Enter your password to show your recovery phrase.")}
      >
        <StyledMnemonicForm />
      </PasswordUnlock>
    </div>
  )
}

export default WrappedMnemonicForm
