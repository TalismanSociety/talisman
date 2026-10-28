const CALLER_WAIT_MS = 10_000

const waitForToken = (getToken: () => Promise<string>) =>
  new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for access token")),
      CALLER_WAIT_MS
    )
    getToken()
      .then(resolve, reject)
      .finally(() => clearTimeout(timer))
  })

/**
 * Returns a function that resolves to the `Authorization` header value for the
 * Gandalf access token, or `undefined` when no token could be obtained.
 *
 * For clients that take a request hook instead of a `fetch` (e.g. the LI.FI SDK's
 * `requestInterceptor`). Each call waits up to 10s for `getToken`; the wait only gives up
 * on this caller, the token acquisition behind `getToken` carries on for the next one.
 */
export const createGandalfAuthorization =
  (getToken: () => Promise<string>) => async (): Promise<string | undefined> => {
    try {
      return `Bearer ${await waitForToken(getToken)}`
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
export const createGandalfFetch = (getToken: () => Promise<string>): typeof fetch => {
  const getAuthorization = createGandalfAuthorization(getToken)

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
