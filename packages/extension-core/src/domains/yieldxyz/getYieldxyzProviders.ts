// import { Loadable } from "@talismn/util"
// import { log } from "extension-shared"
// import { Observable } from "rxjs"

// // import { fetchYieldxyzProviders, YieldxyzProvider } from "./fetchYieldxyzProviders"

// // const fetchYieldXyzProductOpportunities = async ({
// //   networks,
// //   // inputTokens,
// //   offset = 0,
// //   limit = 100,
// //   signal,
// // }: OpportunitiesQuery): Promise<YieldsControllerGetYields200> => {
// //   const url = new URL(`${YIELD_API_BASE_URL}/yields`)
// //   // not filtering by inputTokens because that creates a too long url that results in errors (6K+ chars with dev wallet)
// //   // one optimization could be to maintain an array of valid inputTokens (that actually have a yield product associated) in our api
// //   // => for now filter the result set instead

// //   url.searchParams.append("networks", networks.join(","))
// //   //url.searchParams.append("inputTokens", inputTokens.join(","))
// //   url.searchParams.append("offset", offset.toString())
// //   url.searchParams.append("limit", limit.toString())

// //   const response = await fetch(url.toString(), {
// //     signal,
// //     headers: {
// //       "Content-Type": "application/json",
// //     },
// //   })

// //   if (!response.ok) {
// //     try {
// //       const errorResponse = await response.json()
// //       log.warn("[Yield.xyz] API error response", { status: response.status, errorResponse })
// //     } catch {
// //       // ignore
// //     }
// //     throw new Error(`Yield API error: ${response.status} - ${response.statusText}`)
// //   }

// //   return response.json() as Promise<YieldsControllerGetYields200>
// // }

// // export const fetchAllYieldxyzProviders = async (
// //   signal?: AbortSignal,
// // ): Promise<YieldxyzProvider[]> => {
// //   let offset = 0
// //   const limit = 100
// //   let all: YieldxyzProvider[] = []

// //   for (;;) {
// //     const res = await fetchYieldxyzProviders(
// //       {
// //         offset,
// //         limit,
// //       },
// //       signal,
// //     )

// //     const items = res.items
// //     const total = res.total

// //     all = all.concat(items)

// //     const fetchedCount = items.length
// //     const reachedTotal = typeof total === "number" ? offset + fetchedCount >= total : false

// //     if (fetchedCount < limit || reachedTotal) return all

// //     offset += limit
// //   }
// // }

// // type OpportunitiesObsQuery = Pick<OpportunitiesQuery, "networks" | "inputTokens">

// export type YieldxyzProvider = {
//   id: string
//   name: string
//   logoURI: string
//   description: string
//   website: string
//   tvlUsd: object | null
//   type: "protocol" | "validator_provider"
//   references: string[]
// }

// export const getYieldxyzProviders$ = () =>
//   new Observable<Loadable<YieldxyzProvider[]>>((subscriber) => {
//     const stopTimer = log.timer("[Yield.xyz] Fetching providers")
//     const controller = new AbortController()
//     const signal = controller.signal

//     let offset = 0
//     const limit = 100
//     let all: YieldxyzProvider[] = []
//     let cancelled = false

//     const emitLoading = () => subscriber.next({ status: "loading", data: all })

//     emitLoading()

//     const load = async () => {
//       try {
//         while (!cancelled) {
//           const res = await fetchYieldxyzProviders(
//             {
//               offset,
//               limit,
//             },
//             signal,
//           )
//           // console.log("OPPORTUNITIES", { res, networks, offset, limit })

//           const items = res.items
//           const total = res.total

//           all = all.concat(items)
//           emitLoading()

//           const fetchedCount = items.length
//           const reachedTotal = typeof total === "number" ? offset + fetchedCount >= total : false

//           if (fetchedCount < limit || reachedTotal) {
//             stopTimer()
//             subscriber.next({ status: "success", data: all })
//             subscriber.complete()
//             return
//           }

//           offset += limit
//         }
//       } catch (error) {
//         if (cancelled) return

//         const err = error as Error
//         subscriber.next({
//           status: "error",
//           error: {
//             name: err?.name ?? "YieldxyzError",
//             message: err?.message ?? "Failed to fetch yield.xyz opportunities",
//           },
//         })
//         subscriber.error?.(error) // TODO do we really need this ?
//       }
//     }

//     void load()

//     return () => {
//       cancelled = true
//       controller.abort()
//     }
//   })
