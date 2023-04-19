import { appStore } from "@core/domains/app/store.app"
import Button, { ButtonGroup } from "@talisman/components/Button"
import { Card } from "@talisman/components/Card"
import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { EyeIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { useSetting } from "@ui/hooks/useSettings"
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
  onReject: () => void
  onLearnMoreClick: () => void
}

export const AlertCard = styled(({ className, onLearnMoreClick, onAccept, onReject }: Props) => {
  return (
    <Card
      className={className}
      title={
        <>
          <EyeIcon className="icon inline-block" /> Help us improve Talisman
        </>
      }
      description={
        <>
          <p>
            We'd like to gather{" "}
            <button className="learn-more" onClick={onLearnMoreClick}>
              anonymous usage data
            </button>{" "}
            to help improve the experience of using Talisman.
          </p>
          <p>
            If you opt-in, we will track minimal data and treat it with the respect it deserves. By
            accepting, you acknowledge you have read and agree to our updated{" "}
            <a
              href="https://docs.talisman.xyz/talisman/legal-and-security/privacy-policy"
              target="_blank"
              rel="noreferrer"
            >
              Privacy Policy
            </a>
          </p>
        </>
      }
      cta={
        <StackedButtonGroup>
          <Button primary onClick={onAccept}>
            I Agree
          </Button>
          <Button onClick={onReject}>No Thanks</Button>
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

const AnalyticsAlertPopupDrawer = () => {
  const { close, isOpen, setIsOpen } = useOpenClose()
  const [, setUseAnalyticsTracking] = useSetting("useAnalyticsTracking")

  useEffect(() => {
    const sub = appStore.observable.subscribe(({ analyticsRequestShown }) => {
      setIsOpen(!analyticsRequestShown)
    })
    return () => {
      sub.unsubscribe()
    }
  }, [setIsOpen])

  const handleOpenLearnMore = useCallback(() => {
    api.dashboardOpen("/settings/analytics")
    close()
  }, [close])

  const handleAcceptReject = useCallback(
    (accept: boolean) => {
      setUseAnalyticsTracking(accept)
      appStore.set({ analyticsRequestShown: true })
      close()
    },
    [close, setUseAnalyticsTracking]
  )

  return (
    <Drawer open={isOpen} anchor="bottom">
      <AlertCard
        onLearnMoreClick={handleOpenLearnMore}
        onAccept={() => handleAcceptReject(true)}
        onReject={() => handleAcceptReject(false)}
      />
    </Drawer>
  )
}

// use default export to enable lazy loading
export default AnalyticsAlertPopupDrawer
