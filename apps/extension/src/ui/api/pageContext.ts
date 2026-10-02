/**
 * What this page shows, for code without React context: toasts (their container is outside the
 * router), the root error boundary (outside every provider) and `track()` itself. Each page is
 * its own JS realm, so this is per page. Each slot has one writer.
 */
type PageContext = {
  /** Writer: the screen tracker. */
  screen: string | null
  /** Writer: the request window, once its request arrived. */
  requestId: string | null
}

export const pageContext: PageContext = { screen: null, requestId: null }
