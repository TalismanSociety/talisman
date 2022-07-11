import { initSentry } from "@core/config/sentry"
import * as Sentry from "@sentry/react"
import { ErrorBoundary } from "@talisman/components/ErrorBoundary"
import NotificationProvider from "@talisman/components/Notification"
import ThemeProvider from "@talisman/theme"
import React from "react"
import { createRoot } from "react-dom/client"
import { HashRouter } from "react-router-dom"

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
          <HashRouter>
            <NotificationProvider>{app}</NotificationProvider>
          </HashRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </React.StrictMode>
  )
}
