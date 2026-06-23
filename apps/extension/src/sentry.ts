import { sentry } from "@core/config/sentry"
import { triggerIndexedDbUnavailablePopup } from "@core/domains/app/store.errors"

// Sentry must not be initialised in the global state (`Sentry.init`) in browser extensions,
// or events may leak between the extension and other Sentry instances (see #2418, #547).
// `sentry` is a manual client + scope, following this guide:
// https://docs.sentry.io/platforms/javascript/best-practices/shared-environments/
export const initSentryFrontend = () => {
  sentry.init("ui")

  // the manual client excludes Sentry's GlobalHandlers integration (it relies on global state),
  // so capture uncaught errors and unhandled rejections with our own listeners.
  // these pages are wholly owned by the extension, so listening here doesn't leak anywhere.
  // mechanism hints mirror GlobalHandlers so these are reported as unhandled crashes
  window.addEventListener("error", (event) => {
    sentry.captureException(event.error ?? event.message, {
      mechanism: { handled: false, type: "onerror" },
    })
    triggerIndexedDbUnavailablePopup(event.error)
  })
  window.addEventListener("unhandledrejection", (event) => {
    sentry.captureException(event.reason, {
      mechanism: { handled: false, type: "onunhandledrejection" },
    })
  })
}
