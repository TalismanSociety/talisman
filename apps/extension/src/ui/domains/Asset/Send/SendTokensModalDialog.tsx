import { ChevronLeftIcon, XIcon } from "@talisman/theme/icons"
import { ReactNode } from "react"
import styled from "styled-components"

import { useSendTokens } from "./context"
import { SendReviewHeader } from "./SendReview"
import { useSendTokensModal } from "./SendTokensModalContext"

export const Container = styled.div`
  background: var(--color-background);

  width: 42.2rem;
  height: 60rem;

  display: flex;
  flex-direction: column;
  position: relative;
  border-radius: var(--border-radius);
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  padding: 2.4rem;

  svg {
    width: 2.4rem;
    height: 2.4rem;
    color: var(--color-mid);
    cursor: pointer;
    :hover {
      color: var(--color-foreground);
    }
  }
`

const Title = styled.h3`
  flex-grow: 1;
  margin: 0;
  font-size: 1.6rem;
  line-height: 2.4rem;
  font-weight: 600;
`

const Center = styled.div`
  text-align: center;
  flex-grow: 1;
  margin: 0;
  font-size: 1.6rem;
  line-height: 2.4rem;
  font-weight: 600;
  height: 2.4rem;
`

const Content = styled.div<{ withPaddingTop?: boolean }>`
  flex-grow: 1;
  padding: ${(props) => (props.withPaddingTop ? "2.4rem" : "0")} 2.4rem 2.4rem 2.4rem;
`

const ShowTokensModalDialogHeader = () => {
  const { close } = useSendTokensModal()
  const { cancel, showReview, showForm, transactionId, transactionHash } = useSendTokens()

  // when transaction is executing, we don't display a header anymore
  if (transactionId || transactionHash) return null

  return (
    <Header>
      {showReview && <ChevronLeftIcon onClick={cancel} />}
      {showForm && <Title>Send Funds</Title>}
      {showReview && (
        <Center>
          <SendReviewHeader />
        </Center>
      )}
      <XIcon onClick={close} />
    </Header>
  )
}

export const SendTokensModalDialog = ({ children }: { children?: ReactNode }) => {
  const { showTransaction } = useSendTokens()
  return (
    <Container id="send-funds-container">
      <ShowTokensModalDialogHeader />
      <Content withPaddingTop={showTransaction}>{children}</Content>
    </Container>
  )
}
