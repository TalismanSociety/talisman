import { DEBUG } from "@core/constants"
import { ErrorBoundary as SentryErrorBoundary } from "@sentry/react"
import STATIC from "@talisman/theme/images/hand_open_static_dark.gif"
import { FC, ReactNode, useCallback } from "react"
import styled from "styled-components"
import { Button } from "talisman-ui"

const ErrorContainer = styled.section`
  display: flex;
  align-items: center;
  height: 100%;
  width: 100%;
  min-width: 36rem;
  min-height: 48rem;
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
        font-size: 4.2rem;
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
  }
`

const ErrorMessage: FC<{ error: Error }> = ({ error }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDbVersionError = (error as any)?.inner?.name === "VersionError"

  const clearDatabases = useCallback(() => {
    indexedDB.deleteDatabase("Talisman")
    indexedDB.deleteDatabase("TalismanBalances")
    indexedDB.deleteDatabase("TalismanChaindata")
    indexedDB.deleteDatabase("TalismanConnectionMeta")
    alert(
      "Databases cleared. Please close and reopen your browser (all windows) for Talisman to reinitialize."
    )
    window.close()
  }, [])

  return (
    <ErrorContainer>
      <section>
        <div className="content">
          <h1>Oops !</h1>
          <div>
            <img className="inline-block" src={STATIC} alt="Talisman Hand logo" />
          </div>
          {isDbVersionError ? (
            <p>Invalid database version.</p>
          ) : (
            <p>Sorry, an error occured in Talisman.</p>
          )}
        </div>
        <div className="space-y-4">
          {DEBUG && isDbVersionError && (
            <Button className="w-full" onClick={clearDatabases}>
              Clear local databases
            </Button>
          )}
          <Button className="!w-full" primary onClick={() => window.close()}>
            Close
          </Button>
        </div>
      </section>
    </ErrorContainer>
  )
}

export const ErrorBoundary = ({ children }: { children?: ReactNode }) => {
  return (
    <SentryErrorBoundary fallback={({ error }) => <ErrorMessage error={error} />}>
      {children}
    </SentryErrorBoundary>
  )
}
