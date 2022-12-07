import "@talisman/styles/styles.css"

import { initSentry } from "@core/config/sentry"
import * as Sentry from "@sentry/react"
import { ErrorBoundary } from "@talisman/components/ErrorBoundary"
import { NotificationsContainer } from "@talisman/components/Notifications/NotificationsContainer"
import ThemeProvider from "@talisman/theme"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { createRoot } from "react-dom/client"
import { HashRouter } from "react-router-dom"

import { AppStateProvider } from "./hooks/useAppState"
import { DbCacheProvider } from "./hooks/useDbCache"
import { FeaturesProvider } from "./hooks/useFeatures"
import { SettingsProvider } from "./hooks/useSettings"

const queryClient = new QueryClient()

initSentry(Sentry)
const container = document.getElementById("root")

// render a context dependent app with all providers
// could possibly re-org this slightly better
export const renderTalisman = (app: any) => {
  if (!container) throw new Error("#root element not found.")
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <FeaturesProvider>
              <SettingsProvider>
                <AppStateProvider>
                  <DbCacheProvider>
                    <HashRouter>{app}</HashRouter>
                  </DbCacheProvider>
                </AppStateProvider>
              </SettingsProvider>
            </FeaturesProvider>
            <NotificationsContainer />
          </QueryClientProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </React.StrictMode>
  )
}
