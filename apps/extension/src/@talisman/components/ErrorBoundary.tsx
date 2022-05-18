import React, { FC } from "react"
import { ErrorBoundary as SentryErrorBoundary } from "@sentry/react"
import STATIC from "@talisman/theme/images/hand_open_static_dark.gif"
import styled from "styled-components"
import Button from "./Button"

const ErrorContainer = styled.section`
  display: flex;
  align-items: center;
  height: 100vh;
  width: 100vw;
  justify-content: center;
  color: var(--color-mid);
  text-align: center;

  section {
    padding: 2rem;
    width: 36rem;
    height: 48rem;
    display: flex;
    flex-direction: column;

    .content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;

      h1 {
        font-size: 5rem;
        font-weight: var(--font-weight-bold);
        margin: 0;
      }
      img {
        width: 26rem;
      }
      p {
        margin-bottom: 2rem;
      }
    }

    button {
      margin-top: 2rem;
      display: inline-flex;
      width: 100%;
    }
  }
`

const ErrorMessage: FC = () => (
  <ErrorContainer>
    <section>
      <div className="content">
        <h1>Oops !</h1>
        <div>
          <img src={STATIC} alt="Talisman Hand logo" />
        </div>
        <p>Sorry, an error occured in Talisman.</p>
      </div>
      <div>
        <Button primary onClick={() => window.close()}>
          Close
        </Button>
      </div>
    </section>
  </ErrorContainer>
)

export const ErrorBoundary: React.FC = ({ children }) => {
  return <SentryErrorBoundary fallback={<ErrorMessage />}>{children}</SentryErrorBoundary>
}
