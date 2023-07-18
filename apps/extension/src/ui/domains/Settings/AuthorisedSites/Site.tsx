import { ProviderType } from "@core/domains/sitesAuthorised/types"
import Dialog from "@talisman/components/Dialog"
import Expander from "@talisman/components/Expander"
import Favicon from "@talisman/components/Favicon"
import Link from "@talisman/components/Link"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import Rule from "@talisman/components/Rule"
import { AlertCircleIcon } from "@talisman/theme/icons"
import useAuthorisedSiteById from "@ui/hooks/useAuthorisedSiteById"
import { FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import styled from "styled-components"

import { AuthorisedSitesListAccount } from "./AuthorisedSitesListAccount"

const Title: FC<{ name: string; domain: string; className?: string }> = ({
  name,
  domain,
  className,
}) => (
  <span className={className}>
    <Favicon small url={domain} />
    <span>{name || domain}</span>
  </span>
)

const StyledTitle = styled(Title)`
  display: flex;
  align-items: center;
  font-size: var(--font-size-normal);

  span {
    display: inline-block;
    line-height: 1em;
    margin-left: 0.4em;
  }
`

const ConfirmForgetDialog: FC<{ onConfirm: () => void; onCancel: () => void }> = ({
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation("admin")
  return (
    <Dialog
      icon={<AlertCircleIcon />}
      title={t("Are you sure?")}
      text={t("You can always reconnect to this site by visiting it in the future.")}
      confirmText={t("Forget Site")}
      cancelText={t("Cancel")}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}

type ConnectedSiteProps = {
  id: string
  provider: ProviderType
  className?: string
}

const ConnectedSite = ({ id, provider, className }: ConnectedSiteProps) => {
  const { t } = useTranslation("admin")
  const { origin, connected, availableAddresses, toggleAll, toggleOne, forget } =
    useAuthorisedSiteById(id, provider)
  const [showForget, setShowForget] = useState(false)
  const hideForget = useCallback(() => setShowForget(false), [])
  const confirmForget = useCallback(() => {
    forget()
    setShowForget(false)
  }, [forget])

  return (
    <Expander
      title={<StyledTitle name={origin} domain={id} />}
      subtitle={origin === "" ? "" : id} //if origin is empty (ethereum), id is displayed with Favicon
      info={connected?.length}
      className={className}
    >
      <div className="options">
        <Link onClick={() => setShowForget(true)}>{t("Forget Site")}</Link>
        <Rule vertical />
        <Link onClick={() => toggleAll(false)}>{t("Disconnect All")}</Link>
        {provider !== "ethereum" && (
          <>
            <Rule vertical />
            <Link onClick={() => toggleAll(true)}>{t("Connect All")}</Link>
          </>
        )}
      </div>
      {availableAddresses.map((address) => (
        <AuthorisedSitesListAccount
          key={address}
          address={address}
          isConnected={connected.includes(address)}
          onChange={() => toggleOne(address)}
        />
      ))}
      <Modal open={showForget} onClose={hideForget}>
        <ModalDialog title={t("Confirm Forget")} onClose={hideForget}>
          <ConfirmForgetDialog onConfirm={confirmForget} onCancel={hideForget} />
        </ModalDialog>
      </Modal>
    </Expander>
  )
}

const StyledConnectedSite = styled(ConnectedSite)`
  .info {
    color: var(--color-primary);
  }

  .options {
    font-size: var(--font-size-xsmall);
    color: var(--color-mid);
    text-align: right;

    .link {
      font-size: inherit;
      color: inherit;
      padding: 0;

      &:hover {
        color: var(--color-primary);
      }
    }
  }

  .authorised-site-account {
    margin: 1em 0;
  }
`

export default StyledConnectedSite
