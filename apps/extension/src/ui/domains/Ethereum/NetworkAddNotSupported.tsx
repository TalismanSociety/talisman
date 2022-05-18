import { Drawer } from "@talisman/components/Drawer"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { InfoIcon } from "@talisman/theme/icons"
import styled from "styled-components"

const Container = styled(ModalDialog)`
  background: var(--color-background-muted);

  svg {
    font-size: 4rem;
    color: var(--color-primary);
  }
  p {
    font-size: 1.4rem;
    line-height: 1.8rem;
    color: var(--color-mid);
    text-align: center;
    margin-bottom: 2.4rem;
  }
  ${SimpleButton} {
    width: 100%;
  }
`

type NetworkAddNotSupportedProps = {
  onClose: () => void
}

export const NetworkAddNotSupported = ({ onClose }: NetworkAddNotSupportedProps) => {
  return (
    <Drawer open anchor="bottom">
      <Container centerTitle title={<InfoIcon />}>
        <p>Talisman does not currently support this network.</p>
        <div>
          <SimpleButton onClick={onClose}>Close</SimpleButton>
        </div>
      </Container>
    </Drawer>
  )
}
