import CtaButton from "@talisman/components/CtaButton"
import Grid from "@talisman/components/Grid"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { ShieldIcon, ToolIcon } from "@talisman/theme/icons"
import { ReactComponent as IconClock } from "@talisman/theme/icons/clock.svg"
import { ReactComponent as IconInfo } from "@talisman/theme/icons/info.svg"
import { ReactComponent as IconKey } from "@talisman/theme/icons/key.svg"
import { ReactComponent as IconLink } from "@talisman/theme/icons/link.svg"
import { ReactComponent as IconList } from "@talisman/theme/icons/list.svg"
import { ReactComponent as IconLock } from "@talisman/theme/icons/lock.svg"
import Layout from "@ui/apps/dashboard/layout"
import { MnemonicModal } from "@ui/domains/Settings/MnemonicModal"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"

import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import styled from "styled-components"

const Dialog = styled(ModalDialog)`
  width: 50.3rem;
`

const Settings = () => {
  const { isOpen: isOpenMigratePw, open: openMigratePw, close: closeMigratePw } = useOpenClose()
  const {
    isOpen: isOpenBackupMnemonic,
    open: openBackupMnemonic,
    close: closeBackupMnemonic,
  } = useOpenClose()
  const { isNotConfirmed } = useMnemonicBackup()

  // auto open backup popup if requested in query string
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get("showMigratePasswordModal") !== null) {
      // migrating the password requires backing up the seed, so this modal has priority
      openMigratePw()
      setSearchParams({})
    } else if (searchParams.get("showBackupModal") !== null) {
      openBackupMnemonic()
      setSearchParams({})
    }
  }, [openMigratePw, openBackupMnemonic, searchParams, setSearchParams])

  return (
    <Layout centered>
      <HeaderBlock title="Settings" />
      <Spacer />
      <Grid columns={1}>
        <CtaButton
          icon={<IconKey />}
          title="Backup Wallet"
          subtitle="Backup your recovery phrase"
          onClick={open}
        />
        <CtaButton
          icon={<IconLink />}
          title="Trusted Sites"
          subtitle="Manage the sites that have access to your accounts"
          to={`/settings/connected-sites`}
        />
        <CtaButton
          icon={<IconList />}
          title="Manage Custom Tokens"
          subtitle="Add or delete custom ERC20 tokens"
          to={`/tokens`}
        />
        <CtaButton
          icon={<ToolIcon />}
          title="Extension Options"
          subtitle="Customise your extension experience"
          to={`/settings/options`}
        />
        <CtaButton
          icon={<ShieldIcon />}
          title="Security and Privacy"
          subtitle="Control security and privacy preferences"
          to={`/settings/security-privacy-settings`}
        />
        <CtaButton
          icon={<IconLock />}
          title="Change password"
          subtitle={
            isNotConfirmed
              ? "Please back up your recovery phrase before you change your password."
              : "Change your Talisman password"
          }
          to={`/settings/change-password`}
          disabled={isNotConfirmed}
        />
        <CtaButton
          icon={<IconClock />}
          title="Auto-lock Timer"
          subtitle="Set a timer to automatically lock the Talisman extension"
          to={`/settings/autolock`}
        />
        <CtaButton
          icon={<IconInfo />}
          title="About"
          subtitle="Read our Privacy Policy and Terms of Use"
          to={`/settings/about`}
        />
      </Grid>
      <MnemonicModal open={isOpenBackupMnemonic} onClose={closeBackupMnemonic} />
      <Modal open={isOpenMigratePw} onClose={closeMigratePw}>
        <Dialog title="Backup recovery phrase" onClose={closeMigratePw}>
          MIGRATE YOUR PASSWORD
        </Dialog>
      </Modal>
    </Layout>
  )
}

export default Settings
