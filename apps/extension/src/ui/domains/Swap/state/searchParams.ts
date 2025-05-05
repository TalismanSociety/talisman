import { map } from "rxjs"

import { location$ } from "@ui/state/location"

/** NOTE: This is only compatible with HashRouter */
export const searchParams$ = location$.pipe(
  map((location) => new URLSearchParams(location.hash.split("?")[1])),
)

/**
 * Needed because we use HashRouter.
 * URLs usually go domain.tld/path?searchParams#hash
 * but with HashRouter, we want domain.tld/path#hash?searchParams
 */
export const setSearchParams = (params: URLSearchParams) => {
  const url = new URL(window.location.toString())

  const paramsStr = params.toString()
  url.hash = url.hash.split("?")[0].concat(paramsStr.length ? `?${paramsStr}` : "")

  window.history.pushState({}, "", url.toString())
}
