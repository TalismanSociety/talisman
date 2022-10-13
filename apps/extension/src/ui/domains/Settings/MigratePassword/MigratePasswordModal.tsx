import { Modal as BaseModal } from "@talisman/components/Modal"
import { useState } from "react"
import styled from "styled-components"
import { BackUpMnemonicDialog } from "./BackUpMnemonicDialog"
import { EnterPasswordForm } from "./EnterPassword"

type MigratePasswordModalProps = {
  open: boolean
  onClose: () => void
}

const Modal = styled(BaseModal)`
  .modal-dialog {
    width: 50.3rem;
  }
`

const useMigratePassword = () => {
  const [password, setPassword] = useState<string>()
  const [mnemonic, setMnemonic] = useState<string>()
  const [hasBackedUpMnemonic, setHasBackedUpMnemonic] = useState<boolean>(false)

  const hasPassword = !!password

  return {
    hasPassword,
    setPassword,
    mnemonic,
    setMnemonic,
    hasBackedUpMnemonic,
    setHasBackedUpMnemonic,
  }
}

export const MigratePasswordModal = ({ open, onClose }: MigratePasswordModalProps) => {
  const {
    hasPassword,
    setPassword,
    hasBackedUpMnemonic,
    setHasBackedUpMnemonic,
    mnemonic,
    setMnemonic,
  } = useMigratePassword()

  return (
    <Modal open={open} onClose={onClose}>
      {!hasPassword && (
        <EnterPasswordForm
          onSuccess={(password, mnemonic) => {
            setPassword(password)
            setMnemonic(mnemonic)
          }}
        />
      )}
      {hasPassword && !hasBackedUpMnemonic && mnemonic && (
        <BackUpMnemonicDialog onBackedUp={() => setHasBackedUpMnemonic(true)} mnemonic={mnemonic} />
      )}
      {hasPassword && hasBackedUpMnemonic && <>COOL stuff thanks</>}
    </Modal>
  )
}
