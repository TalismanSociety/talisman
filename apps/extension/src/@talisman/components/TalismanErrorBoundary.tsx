import { DEBUG, DISCORD_TALISMAN_URL } from "@common/constants"
import { ErrorBoundary as SentryErrorBoundary } from "@sentry/react"
import { TalismanDeadHandIcon } from "@talismn/icons"
import { Button } from "@ui/talisman-ui/components/Button"
import type { DexieError } from "dexie"
import { type ReactNode, useCallback } from "react"

export const TalismanErrorBoundary = ({ children }: { children?: ReactNode }) => (
  <SentryErrorBoundary fallback={ErrorMessage}>{children}</SentryErrorBoundary>
)

function ErrorMessage({ error, eventId }: { error: unknown; eventId?: string }) {
  const isDbVersionError = (error as DexieError)?.inner?.name === "VersionError"
  const canClearDatabases = DEBUG && isDbVersionError
  const errorMessage = isDbVersionError
    ? "Invalid database version"
    : "Sorry, an error occurred in Talisman"

  const clearDatabases = useCallback(() => {
    indexedDB.deleteDatabase("Talisman")
    indexedDB.deleteDatabase("TalismanBalances")
    indexedDB.deleteDatabase("TalismanChaindata")
    indexedDB.deleteDatabase("TalismanChaindataV4")
    indexedDB.deleteDatabase("TalismanConnectionMeta")
    alert("Databases cleared. Please click OK for Talisman to reinitialise")
    chrome.runtime.reload()
  }, [])

  return (
    <section className="mx-auto flex h-[60rem] max-h-screen w-[40rem] max-w-screen flex-col overflow-hidden p-10 text-center text-body-secondary">
      <div className="flex w-full flex-grow flex-col items-center justify-center gap-16">
        <h1 className="m-0 font-bold text-3xl text-white">Oops!</h1>
        <TalismanDeadHandIcon className="text-[16rem]" />
        <div className="flex flex-col gap-2">
          <div>{errorMessage}</div>
          {!canClearDatabases && (
            <>
              <a
                className="text-primary/80 hover:text-primary focus:text-primary"
                href={DISCORD_TALISMAN_URL}
                target="_blank"
                rel="noreferrer noopener"
              >
                Contact us on Discord for support
              </a>
              {eventId ? (
                <div className="mt-8 text-tiny text-white/40">Error ID:&nbsp;{eventId}</div>
              ) : null}
            </>
          )}
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-4">
        {canClearDatabases && (
          <Button fullWidth color="red" onClick={clearDatabases}>
            Clear local databases
          </Button>
        )}
        <Button fullWidth onClick={() => window.close()}>
          Close
        </Button>
      </div>
    </section>
  )
}
