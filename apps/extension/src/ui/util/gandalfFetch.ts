import { filter, firstValueFrom, timeout } from "rxjs"
import { gandalfAccessToken$ } from "../state/gandalf"

export const getGandalfAccessToken = () =>
  firstValueFrom(
    gandalfAccessToken$.pipe(
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
 * A `fetch` wrapper that injects the Gandalf access-token as a Bearer header.
 *
 * Pass this as the `customFetch` option when constructing any swagger-typescript-api
 * client that targets a Gandalf-protected API (e.g. `Sn45Api`, `TaoDataApi`).
 *
 * On the very first call it waits for the token to be available (registration +
 * PoW, up to 10s). Subsequent calls resolve near-instantly from the shared replay.
 * If the token cannot be obtained, the request proceeds without an Authorization
 * header so the server can respond with 401.
 */
export const gandalfFetch: typeof fetch = async (input, init) => {
  try {
    const token = await getGandalfAccessToken()
    const headers = new Headers(init?.headers)
    headers.set("Authorization", `Bearer ${token}`)
    return fetch(input, { ...init, headers })
  } catch {
    return fetch(input, init)
  }
}
