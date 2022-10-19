import Field from "@talisman/components/Field"

import Spacer from "@talisman/components/Spacer"
import { api } from "@ui/api"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useCallback, useEffect, useState } from "react"
import styled from "styled-components"
import { Mnemonic } from "./Mnemonic"
import { PasswordUnlock, usePasswordUnlock } from "./PasswordUnlock"

const Description = () => (
  <div className="text-body-secondary whitespace-pre-wrap font-light">
    <p className="mt-1">
      Your recovery phrase gives you access to your wallet and funds. It can be used to restore your
      Talisman created accounts if you lose access to your device, or forget your password.
    </p>
    <p className="mt-1">
      We strongly encourage you to back up your recovery phrase by writing it down and storing it in
      a secure location.{" "}
      <a
        href="https://docs.talisman.xyz/talisman/navigating-the-paraverse/account-management/back-up-your-secret-phrase"
        target="_blank"
        className="text-body opacity-100"
      >
        Learn more.
      </a>
    </p>
  </div>
)

type MnemonicFormProps = {
  className?: string
}

const MnemonicForm = ({ className }: MnemonicFormProps) => {
  const { isConfirmed, toggleConfirmed } = useMnemonicBackup()
  const [mnemonic, setMnemonic] = useState<string>()
  const { password } = usePasswordUnlock()
  const getMnemonic = useCallback(
    async (password: string) => await api.mnemonicUnlock(password),
    []
  )

  useEffect(() => {
    if (!password) return
    getMnemonic(password).then((result) => setMnemonic(result))
  }, [getMnemonic, password])

  return (
    <div className={className}>
      {mnemonic && (
        <>
          <Description />
          <Spacer small />
          <Mnemonic mnemonic={mnemonic} />
          <Spacer />
          <Field.Toggle
            className="toggle"
            info="I've backed it up"
            value={isConfirmed}
            onChange={(val: boolean) => toggleConfirmed(val)}
          />
        </>
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
  return (
    <PasswordUnlock
      buttonText="View Recovery Phrase"
      description={<Description />}
      title="Enter your password to show your recovery phrase"
    >
      <StyledMnemonicForm className={className} />
    </PasswordUnlock>
  )
}

export default WrappedMnemonicForm
