import { FC, useEffect, useState } from "react"
import styled from "styled-components"
import Field from "@talisman/components/Field"
import Button from "@talisman/components/Button"
import imgBraveFlag from "@talisman/theme/images/brave_flag.gif"
import Browser from "webextension-polyfill"
import { appStore } from "@core/domains/app/store.app"

const ModalContainer = styled.div<{ small?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  text-align: center;
  color: var(--color-mid);

  p {
    font-size: var(--font-size-${(small) => (small ? "xsmall" : "small")});

    padding: 0 1.6rem;

    b {
      color: var(--color-foreground);
    }
  }

  img {
    max-width: 100%;
    border-radius: var(--border-radius-small);
  }

  .toggle {
    display: inline-flex;
    flex-direction: row;
    .children {
      display: inline-flex;
    }
  }
`

type BraveWarningModalProps = {
  className?: string
  popup?: boolean
}

export const BraveWarningModal: FC<BraveWarningModalProps> = ({ className, popup }) => {
  const [hideBraveWarning, setHideBraveWarning] = useState<boolean>()
  const [hasBraveWarningBeenShown, setHasBraveWarningBeenShown] = useState<boolean>()

  useEffect(() => {
    if (!hasBraveWarningBeenShown) appStore.set({ hasBraveWarningBeenShown: true })
  }, [hasBraveWarningBeenShown])

  useEffect(() => {
    const sub = appStore.observable.subscribe((settings) => {
      setHideBraveWarning(settings.hideBraveWarning)
      setHasBraveWarningBeenShown(settings.hasBraveWarningBeenShown)
    })
    return () => sub.unsubscribe()
  }, [])

  return (
    <ModalContainer className={className} small={popup}>
      <p>
        Due to a recent Brave update (v 1.36) some balances may not display correctly. In order to
        view your balances please disable the <b>Restrict WebSockets Pool</b> flag and relaunch
        Brave.
      </p>
      <div>
        <img src={imgBraveFlag} alt="brave flag setting" />
      </div>
      <Button
        primary
        onClick={() =>
          Browser.tabs.create({
            url: "brave://flags/#restrict-websockets-pool",
            active: true,
          })
        }
      >
        Open Brave flags
      </Button>
      <Button
        external
        to="https://docs.talisman.xyz/talisman/help-and-support/troubleshooting/balances-on-brave-not-showing"
      >
        Read the docs
      </Button>
      <div>
        <Field.Toggle
          className="toggle"
          info="Don't prompt me again"
          value={hideBraveWarning}
          onChange={(val: boolean) => appStore.set({ hideBraveWarning: val })}
        />
      </div>
    </ModalContainer>
  )
}
