import passwordStore from "@core/domains/app/store.password"
import Button, { ButtonGroup } from "@talisman/components/Button"
import { Card } from "@talisman/components/Card"
import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { LockIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { sendAnalyticsEvent } from "@ui/api/analytics"

import { useCallback, useEffect } from "react"
import styled from "styled-components"

const StackedButtonGroup = styled(ButtonGroup)`
  flex-direction: column;
  align-items: stretch;
  gap: 1rem;
`

type Props = {
  className?: string
  onAccept: () => void
}

export const AlertCard = styled(({ className, onAccept }: Props) => {
  return (
    <Card
      className={className}
      title={
        <>
          <LockIcon className="icon inline-block" /> Update Your Password
        </>
      }
      description={
        <p>
          We’re upgrading our security measures, including enhanced password encryption. Please
          update your password to continue.{" "}
          <a
            href="https://docs.talisman.xyz/talisman/legal-and-security/privacy-policy"
            target="_blank"
            rel="noreferrer"
          >
            Learn more about our new security features.
          </a>
        </p>
      }
      cta={
        <StackedButtonGroup>
          <Button primary onClick={onAccept}>
            Update Password
          </Button>
        </StackedButtonGroup>
      }
    />
  )
})`
  margin-bottom: 0;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  text-align: center;

  .icon {
    color: var(--color-primary);
  }

  .card-title {
    gap: 1rem;
  }

  .card-description {
    color: var(--color-mid);
    font-size: small;

    > p {
      font-size: var(--font-size-small);
      > a {
        text-decoration: underline;
        color: var(--color-foreground-muted);
        opacity: 1;
      }

      & .learn-more {
        color: var(--color-foreground-muted);
        text-decoration: underline;
        cursor: pointer;
      }
    }
  }

  .card-cta > * {
    width: 100%;
  }

  a:link,
  a:visited {
    color: var(--color-mid);
  }
  a:hover,
  a:active {
    color: var(--color-foreground);
  }
`

const PasswordMigrationAlertPopupDrawer = () => {
  const { close, isOpen, setIsOpen } = useOpenClose()

  useEffect(() => {
    const sub = passwordStore.observable.subscribe(({ isHashed }) => {
      setIsOpen(!isHashed)
    })
    return () => {
      sub.unsubscribe()
    }
  }, [setIsOpen])

  const handleAccept = useCallback(() => {
    sendAnalyticsEvent({
      container: "Popup",
      feature: "Navigation",
      featureVersion: 3,
      page: "Portfolio",
      name: "Goto",
      action: "Migrate password button",
    })
    api.dashboardOpen("/settings?showMigratePasswordModal")
    close()
  }, [close])

  return (
    <Drawer open={isOpen} anchor="bottom">
      <AlertCard onAccept={handleAccept} />
    </Drawer>
  )
}

// use default export to enable lazy loading
export default PasswordMigrationAlertPopupDrawer
