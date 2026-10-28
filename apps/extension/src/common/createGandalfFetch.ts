import type { Loadable } from "@talismn/util"
import { filter, firstValueFrom, type Observable, timeout } from "rxjs"

const getAccessToken = (accessToken$: Observable<Loadable<string>>) =>
  firstValueFrom(
    accessToken$.pipe(
      filter((loadable) => loadable.status !== "loading"),
      timeout({
        each: 10_000,
        with: () => {
          throw new Error("Timed out waiting for access token")
        },
      })
    )
  ).then((loadable) => {
    if (loadable.status === "success") return loadable.data ?? ""
    throw new Error(loadable.error?.message ?? "Failed to obtain access token")
  })

/**
 * Returns a function that resolves to the `Authorization` header value for the
 * Gandalf access token, or `undefined` when no token could be obtained.
 *
 * For clients that take a request hook instead of a `fetch` (e.g. the LI.FI SDK's
 * `requestInterceptor`). The first call waits up to 10s for the token (registration
 * + PoW). Later calls resolve from the shared replay.
 */
export const createGandalfAuthorization =
  (accessToken$: Observable<Loadable<string>>) => async (): Promise<string | undefined> => {
    try {
      return `Bearer ${await getAccessToken(accessToken$)}`
    } catch {
      return undefined
    }
  }

/**
 * A `fetch` wrapper that injects the Gandalf access token as a Bearer header.
 *
 * Pass the result as the `customFetch` option of any swagger-typescript-api client
 * that targets a Gandalf-protected API (e.g. `Sn45Api`, `TaoDataApi`), or as the
 * `fetch` option of an openapi-fetch client. openapi-fetch passes a `Request` and no
 * `init`, so the headers are read from the `Request` when `init` has none.
 *
 * Without a token the request goes out without an Authorization header, so the
 * server can respond with 401.
 */
export const createGandalfFetch = (accessToken$: Observable<Loadable<string>>): typeof fetch => {
  const getAuthorization = createGandalfAuthorization(accessToken$)

  return async (input, init) => {
    const authorization = await getAuthorization()
    if (!authorization) return fetch(input, init)

    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined)
    )
    headers.set("Authorization", authorization)
    return fetch(input, { ...init, headers })
  }
}
