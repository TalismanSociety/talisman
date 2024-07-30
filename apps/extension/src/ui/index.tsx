import "@talisman/theme/styles.css"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React, { ReactNode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { HashRouter } from "react-router-dom"
import { FontFamily, preloadFonts } from "talisman-ui"

import { ErrorBoundary } from "@talisman/components/ErrorBoundary"
import { ErrorBoundaryDatabaseMigration } from "@talisman/components/ErrorBoundaryDatabaseMigration"
import { NotificationsContainer } from "@talisman/components/Notifications/NotificationsContainer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { useKeepBackgroundOpen } from "@ui/hooks/useKeepBackgroundOpen"

import { initSentryFrontend } from "../sentry"

const FONT_FAMILIES_DEFAULT: FontFamily[] = ["Surt", "SurtExpanded"]
const FONT_FAMILIES_ONBOARDING: FontFamily[] = ["Surt", "SurtExpanded", "WhyteInktrapMedium"]
const FONT_FAMILIES =
  window.location.pathname === "/onboarding.html" ? FONT_FAMILIES_ONBOARDING : FONT_FAMILIES_DEFAULT
preloadFonts(FONT_FAMILIES)

const KeepBackgroundOpen = () => {
  useKeepBackgroundOpen()
  return null
}

const queryClient = new QueryClient()

initSentryFrontend()
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
            <KeepBackgroundOpen />
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
