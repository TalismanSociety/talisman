import { BehaviorSubject, distinctUntilChanged, map } from "rxjs"

const openUiPortsCount$ = new BehaviorSubject(0)

/** Must be called from the PORT_EXTENSION onConnect listener, for each UI port (popup, dashboard, onboarding). */
export const trackUiPort = (port: chrome.runtime.Port) => {
  openUiPortsCount$.next(openUiPortsCount$.value + 1)
  port.onDisconnect.addListener(() => {
    openUiPortsCount$.next(Math.max(0, openUiPortsCount$.value - 1))
  })
}

/** true while at least one extension UI (popup, dashboard, onboarding) is open */
export const isUiOpen = () => openUiPortsCount$.value > 0

export const isUiOpen$ = openUiPortsCount$.pipe(
  map((count) => count > 0),
  distinctUntilChanged()
)
