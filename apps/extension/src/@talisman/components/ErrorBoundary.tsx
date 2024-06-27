import { DEBUG } from "@extension/shared"
import { ErrorBoundary as SentryErrorBoundary } from "@sentry/react"
import STATIC from "@talisman/theme/images/hand_open_static_dark.gif"
import { DexieError } from "dexie"
import { FC, ReactNode, useCallback } from "react"
import { Button } from "talisman-ui"

const ErrorMessage: FC<{ error: unknown }> = ({ error }) => {
  const isDbVersionError = (error as DexieError)?.inner?.name === "VersionError"

  const clearDatabases = useCallback(() => {
    indexedDB.deleteDatabase("Talisman")
    indexedDB.deleteDatabase("TalismanBalances")
    indexedDB.deleteDatabase("TalismanChaindata")
    indexedDB.deleteDatabase("TalismanConnectionMeta")
    alert("Databases cleared. Please click OK for Talisman to reinitialize.")
    chrome.runtime.reload()
  }, [])

  return (
    <section className="max-w-screen  text-body-secondary mx-auto flex h-[60rem] max-h-screen w-[40rem] flex-col overflow-hidden p-10 text-center">
      <div className="flex flex-grow flex-col justify-center">
        <h1 className="m-0 text-3xl font-bold">Oops !</h1>
        <div>
          <img className="inline-block" src={STATIC} alt="Talisman Hand logo" />
        </div>
        {isDbVersionError ? (
          <p>Invalid database version.</p>
        ) : (
          <p>Sorry, an error occured in Talisman.</p>
        )}
      </div>
      <div className="flex w-full shrink-0 flex-col gap-4">
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
  )
}

export const ErrorBoundary = ({ children }: { children?: ReactNode }) => {
  return (
    <SentryErrorBoundary fallback={({ error }) => <ErrorMessage error={error} />}>
      {children}
    </SentryErrorBoundary>
  )
}
