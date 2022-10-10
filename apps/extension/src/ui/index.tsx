import "@talisman/styles/styles.css"

import { initSentry } from "@core/config/sentry"
import * as Sentry from "@sentry/react"
import { ErrorBoundary } from "@talisman/components/ErrorBoundary"
import { NotificationsContainer } from "@talisman/components/Notifications/NotificationsContainer"
import ThemeProvider from "@talisman/theme"
import React from "react"
import { createRoot } from "react-dom/client"
import { HashRouter } from "react-router-dom"

import { AppStateProvider } from "./hooks/useAppState"
import { FeaturesProvider } from "./hooks/useFeatures"
import { SettingsProvider } from "./hooks/useSettings"

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
          <FeaturesProvider>
            <SettingsProvider>
              <AppStateProvider>
                <HashRouter>{app}</HashRouter>
              </AppStateProvider>
            </SettingsProvider>
          </FeaturesProvider>
          <NotificationsContainer />
        </ErrorBoundary>
      </ThemeProvider>
    </React.StrictMode>
  )
}
