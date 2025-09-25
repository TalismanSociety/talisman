import "@talisman/theme/styles.css"

import { Subscribe } from "@react-rxjs/core"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode, StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { HashRouter } from "react-router-dom"
import { FontFamily, preloadFonts } from "talisman-ui"

import { ErrorBoundaryDatabaseMigration } from "@talisman/components/ErrorBoundaryDatabaseMigration"
import { NotificationsContainer } from "@talisman/components/Notifications/NotificationsContainer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { TalismanErrorBoundary } from "@talisman/components/TalismanErrorBoundary"
import { useKeepBackgroundOpen } from "@ui/hooks/useKeepBackgroundOpen"
import { KeepWalletUnlockedMode, useKeepWalletUnlocked } from "@ui/hooks/useKeepWalletUnlocked"

import { initSentryFrontend } from "../sentry"

const FONT_FAMILIES_DEFAULT: FontFamily[] = ["Surt", "SurtExpanded", "Inter"]
const FONT_FAMILIES_ONBOARDING: FontFamily[] = ["Surt", "SurtExpanded", "WhyteInktrapMedium"]
const FONT_FAMILIES =
  window.location.pathname === "/onboarding.html" ? FONT_FAMILIES_ONBOARDING : FONT_FAMILIES_DEFAULT
preloadFonts(FONT_FAMILIES)

const KeepBackgroundOpen = () => {
  useKeepBackgroundOpen()
  return null
}
const KeepWalletUnlocked = ({ mode }: { mode?: KeepWalletUnlockedMode }) => {
  useKeepWalletUnlocked({ mode })
  return null
}

const queryClient = new QueryClient()

initSentryFrontend()
const container = document.getElementById("root")

export type RenderTalismanOptions = {
  /** Sets whether the wallet autolock timer should be restarted on a user-interaction, or on a 10s interval. */
  keepWalletUnlockedMode?: KeepWalletUnlockedMode
}

// render a context dependent app with all providers
// could possibly re-org this slightly better
export const renderTalisman = (
  app: ReactNode,
  { keepWalletUnlockedMode }: RenderTalismanOptions = {},
) => {
  if (!container) throw new Error("#root element not found.")
  const root = createRoot(container)
  root.render(
    <StrictMode>
      <TalismanErrorBoundary>
        <ErrorBoundaryDatabaseMigration>
          <Suspense fallback={<SuspenseTracker name="Root" />}>
            <KeepBackgroundOpen />
            <KeepWalletUnlocked mode={keepWalletUnlockedMode} />
            <Subscribe>
              <QueryClientProvider client={queryClient}>
                <HashRouter>{app}</HashRouter>
                <NotificationsContainer />
              </QueryClientProvider>
            </Subscribe>
          </Suspense>
        </ErrorBoundaryDatabaseMigration>
      </TalismanErrorBoundary>
    </StrictMode>,
  )
}
