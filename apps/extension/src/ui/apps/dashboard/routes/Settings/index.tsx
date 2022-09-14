import CtaButton from "@talisman/components/CtaButton"
import Grid from "@talisman/components/Grid"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import Spacer from "@talisman/components/Spacer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { ReactComponent as IconClock } from "@talisman/theme/icons/clock.svg"
import { ReactComponent as IconGlobe } from "@talisman/theme/icons/globe.svg"
import { ReactComponent as IconInfo } from "@talisman/theme/icons/info.svg"
import { ReactComponent as IconKey } from "@talisman/theme/icons/key.svg"
import { ReactComponent as IconLink } from "@talisman/theme/icons/link.svg"
import { ReactComponent as IconList } from "@talisman/theme/icons/list.svg"
import { ReactComponent as IconLock } from "@talisman/theme/icons/lock.svg"
import Layout from "@ui/apps/dashboard/layout"
import Mnemonic from "@ui/domains/Account/Mnemonic"
import { useMnemonicBackupConfirmed } from "@ui/hooks/useMnemonicBackupConfirmed"

const Settings = () => {
  const { isOpen, open, close } = useOpenClose()
  const mnemonicConfirmed = useMnemonicBackupConfirmed() === "TRUE"

  return (
    <Layout centered>
      <HeaderBlock title="Settings" />
      <Spacer />
      <Grid columns={1}>
        <CtaButton
          icon={<IconKey />}
          title="Backup Account"
          subtitle="Export your private key or copy your secret phrase"
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
          title="Manage custom tokens"
          subtitle="Add or delete custom ERC20 tokens"
          to={`/tokens`}
        />
        <CtaButton
          icon={<IconList />}
          title="Extension Options"
          subtitle="Customise your extension experience"
          to={`/settings/options`}
        />
        <CtaButton
          icon={<IconLock />}
          title="Security and Privacy"
          subtitle="Control security and privacy preferences"
          to={`/settings/security-privacy-settings`}
        />
        <CtaButton
          icon={<IconLock />}
          title="Change password"
          subtitle={
            mnemonicConfirmed
              ? "Change your Talisman password"
              : "Please back up your seed phrase before you change your password."
          }
          to={`/settings/change-password`}
          disabled={!mnemonicConfirmed}
        />
        <CtaButton
          icon={<IconInfo />}
          title="About"
          subtitle="Read our Privacy Policy and Terms of Use"
          to={`/settings/about`}
        />
      </Grid>
      <Modal open={isOpen} onClose={close}>
        <ModalDialog title="Secret Phrase" onClose={close}>
          <Mnemonic />
        </ModalDialog>
      </Modal>
    </Layout>
  )
}

export default Settings
