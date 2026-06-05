import { DEBUG, DISCORD_TALISMAN_URL } from "@common/constants"
import { sentry } from "@core/config/sentry"
import { TalismanDeadHandIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import type { DexieError } from "dexie"
import { Component, type ErrorInfo, type ReactNode, useCallback } from "react"

type TalismanErrorBoundaryProps = {
  children?: ReactNode
}

type TalismanErrorBoundaryState = {
  hasError: boolean
  error?: unknown
  eventId?: string
}

/**
 * Error boundary that reports errors to our manual Sentry client.
 * Don't use @sentry/react's ErrorBoundary: it captures via the global Sentry instance,
 * which must not be initialised in browser extensions (see #2418).
 */
export class TalismanErrorBoundary extends Component<
  TalismanErrorBoundaryProps,
  TalismanErrorBoundaryState
> {
  constructor(props: TalismanErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  // an explicit flag rather than gating on the error itself: thrown values may be falsy
  static getDerivedStateFromError(
    error: unknown
  ): Pick<TalismanErrorBoundaryState, "hasError" | "error"> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // mirror @sentry/react's captureReactException: link an error carrying the React
    // component stack via `cause`, surfaced as a navigable stacktrace by the
    // LinkedErrors integration
    if (error instanceof Error && info.componentStack && !error.cause) {
      const boundaryError = new Error(error.message)
      boundaryError.name = `React ErrorBoundary ${error.name}`
      boundaryError.stack = info.componentStack
      error.cause = boundaryError
    }

    const eventId = sentry.captureException(error, {
      captureContext: { contexts: { react: { componentStack: info.componentStack } } },
      mechanism: { handled: true },
    })
    this.setState({ eventId })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorMessage error={this.state.error} eventId={this.state.eventId} />
    }

    return this.props.children
  }
}

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
    <section className="mx-auto flex h-150 max-h-screen w-100 max-w-screen flex-col overflow-hidden p-10 text-center text-body-secondary">
      <div className="flex w-full grow flex-col items-center justify-center gap-16">
        <h1 className="m-0 font-bold text-3xl text-white">Oops!</h1>
        <TalismanDeadHandIcon className="text-[10rem]" />
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
