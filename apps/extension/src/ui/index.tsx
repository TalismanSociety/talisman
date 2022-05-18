import React from "react"
import ReactDOM from "react-dom"
import { HashRouter } from "react-router-dom"
import * as Sentry from "@sentry/react"
import { initSentry } from "@core/sentry"
import NotificationProvider from "@talisman/components/Notification"
import { ErrorBoundary } from "@talisman/components/ErrorBoundary"
import ThemeProvider from "@talisman/theme"

initSentry(Sentry)

// render a context dependent app with all providers
// could possibly re-org this slightly better
export const renderTalisman = (app: any) => {
  ReactDOM.render(
    <React.StrictMode>
      <ThemeProvider>
        <ErrorBoundary>
          <HashRouter>
            <NotificationProvider>{app}</NotificationProvider>
          </HashRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </React.StrictMode>,
    document.getElementById("root")
  )
}
