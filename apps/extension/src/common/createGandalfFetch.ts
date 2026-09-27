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
 * A `fetch` wrapper that injects the Gandalf access token as a Bearer header.
 *
 * Pass the result as the `customFetch` option of any swagger-typescript-api client
 * that targets a Gandalf-protected API (e.g. `Sn45Api`, `TaoDataApi`).
 *
 * The first call waits up to 10s for the token (registration + PoW). Later calls
 * resolve from the shared replay. Without a token the request goes out without an
 * Authorization header, so the server can respond with 401.
 */
export const createGandalfFetch =
  (accessToken$: Observable<Loadable<string>>): typeof fetch =>
  async (input, init) => {
    try {
      const token = await getAccessToken(accessToken$)
      const headers = new Headers(init?.headers)
      headers.set("Authorization", `Bearer ${token}`)
      return fetch(input, { ...init, headers })
    } catch {
      return fetch(input, init)
    }
  }
