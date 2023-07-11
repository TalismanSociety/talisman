import { AppPill } from "@talisman/components/AppPill"
import { Drawer } from "@talisman/components/Drawer"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { XIcon } from "@talisman/theme/icons"
import { useCurrentSite } from "@ui/apps/popup/context/CurrentSiteContext"
import { FC } from "react"
import styled from "styled-components"
import { IconButton } from "talisman-ui"

import { ConnectedAccounts } from "./ConnectedAccounts"

type Props = {
  open: boolean
  onClose: () => void
}

const Container = styled.div`
  background: var(--color-background);
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  > header {
    position: relative;
    text-align: center;
    padding: 2rem 2.4rem;

    .close {
      position: absolute;
      top: 2rem;
      right: 2rem;
    }
  }
  > section {
    flex-grow: 1;
    padding: 0 2.4rem;
    .accounts {
      padding-bottom: 2.4rem;
    }
  }
`

const ConnectedAccountsDrawer: FC<Props> = ({ open, onClose }) => {
  const { id, url } = useCurrentSite()

  if (!id) return null
  return (
    <Drawer fullScreen anchor="right" open={open} onClose={onClose}>
      <Container>
        <header>
          <AppPill url={url} />
          <IconButton className="close" onClick={onClose}>
            <XIcon />
          </IconButton>
        </header>
        <ScrollContainer>
          <ConnectedAccounts siteId={id} />
        </ScrollContainer>
      </Container>
    </Drawer>
  )
}

export default ConnectedAccountsDrawer
