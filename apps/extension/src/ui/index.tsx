import "@talisman/theme/styles.css"

import { initSentry } from "@extension/core"
import * as Sentry from "@sentry/react"
import { ErrorBoundary } from "@talisman/components/ErrorBoundary"
import { ErrorBoundaryDatabaseMigration } from "@talisman/components/ErrorBoundaryDatabaseMigration"
import { NotificationsContainer } from "@talisman/components/Notifications/NotificationsContainer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React, { ReactNode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { HashRouter } from "react-router-dom"

const queryClient = new QueryClient()

initSentry(Sentry)
const container = document.getElementById("root")

// render a context dependent app with all providers
// could possibly re-org this slightly better
export const renderTalisman = (app: ReactNode) => {
  if (!container) throw new Error("#root element not found.")
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <ErrorBoundaryDatabaseMigration>
          <Suspense fallback={<SuspenseTracker name="Root" />}>
            <QueryClientProvider client={queryClient}>
              <HashRouter>{app}</HashRouter>
              <NotificationsContainer />
            </QueryClientProvider>
          </Suspense>
        </ErrorBoundaryDatabaseMigration>
      </ErrorBoundary>
    </React.StrictMode>
  )
}
