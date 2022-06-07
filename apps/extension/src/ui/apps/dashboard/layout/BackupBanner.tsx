import { Card } from "@talisman/components/Card"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { IconAlert } from "@talisman/theme/icons"
import useAccounts from "@ui/hooks/useAccounts"
import { useMnemonicBackupConfirmed } from "@ui/hooks/useMnemonicBackupConfirmed"
import styled from "styled-components"
import Button from "@talisman/components/Button"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import Mnemonic from "@ui/domains/Account/Mnemonic"

export const BackupBanner = styled(({ className }) => {
  const { isOpen, open, close } = useOpenClose()
  const accounts = useAccounts()
  const backupConfirmed = useMnemonicBackupConfirmed()
  const originAccount = accounts?.find((account) => account.origin === "ROOT")

  if (backupConfirmed !== "FALSE" || !originAccount) return null

  return (
    <>
      <Card
        className={className}
        title={
          <>
            <IconAlert className="icon" /> Please backup your account
          </>
        }
        description={
          <span>If you don’t backup your account, you may lose access to all your funds</span>
        }
        cta={
          <Button primary onClick={open}>
            Backup now
          </Button>
        }
      />
      <Modal open={isOpen} onClose={close}>
        <ModalDialog title="Secret Phrase" onClose={close}>
          <Mnemonic address={originAccount?.address} />
        </ModalDialog>
      </Modal>
    </>
  )
})`
  margin: 2rem;

  .icon {
    color: var(--color-primary);
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .card-description {
    color: var(--color-mid);
    font-size: small;
  }

  .card-cta > * {
    width: 100%;
  }
`
