import { describe, expect, it } from "vitest"

import { getSwapRouteReport } from "../swapRouteReport"

const uniswap = { protocol: "lifi", subProtocol: "uniswap" } as const
const sushi = { protocol: "lifi", subProtocol: "sushiswap" } as const
const stealthex = { protocol: "stealthex", subProtocol: undefined } as const
const sortedQuotes = [stealthex, uniswap].map((quote) => ({ quote }))

describe("getSwapRouteReport", () => {
  it("ranks the submitted route and keeps the user's pick", () => {
    expect(
      getSwapRouteReport({
        sortedQuotes,
        selectedQuote: uniswap,
        submittedRoute: { ...uniswap },
        isQuotePicked: true,
      })
    ).toEqual({ quote_rank: 2, provider_picked: true })
  })

  it("reports a route the wallet kept as not picked", () => {
    expect(
      getSwapRouteReport({
        sortedQuotes,
        selectedQuote: stealthex,
        submittedRoute: stealthex,
        isQuotePicked: false,
      })
    ).toEqual({ quote_rank: 1, provider_picked: false })
  })

  it("drops the pick and the rank when the provider replaced the chosen route", () => {
    expect(
      getSwapRouteReport({
        sortedQuotes,
        selectedQuote: uniswap,
        submittedRoute: sushi,
        isQuotePicked: true,
      })
    ).toEqual({ quote_rank: 0, provider_picked: false })
  })
})
