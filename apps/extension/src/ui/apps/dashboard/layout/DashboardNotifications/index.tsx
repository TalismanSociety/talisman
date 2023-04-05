import styled from "styled-components"

import { BackupNotification } from "./BackupNotification"
import { BraveWarningNotification } from "./BraveNotification"

const Container = styled.div`
  position: absolute;
  bottom: 0;
  left: 32rem;
  right: 0;
  padding: 2.4rem;
  display: flex;
  flex-direction: column;
  gap: 2.4rem;
  background: linear-gradient(transparent, 2rem, rgba(var(--color-background-raw, 0.2)));
  :empty {
    display: none;
  }
`

export default () => (
  <Container>
    <BraveWarningNotification />
    <BackupNotification />
  </Container>
)
