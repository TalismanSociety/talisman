import type { BaseQuote } from "./swap-modules/common.swap-module"

type Route = Pick<BaseQuote, "protocol" | "subProtocol">

const isSameRoute = (a: Route | null | undefined, b: Route | null | undefined) =>
  !!a && !!b && a.protocol === b.protocol && a.subProtocol === b.subProtocol

export const getSwapRouteReport = ({
  sortedQuotes,
  selectedQuote,
  submittedRoute,
  isQuotePicked,
}: {
  sortedQuotes: ReadonlyArray<{ quote: Route }>
  selectedQuote: Route | null | undefined
  submittedRoute: Route | null | undefined
  isQuotePicked: boolean
}) => ({
  quote_rank: sortedQuotes.findIndex(({ quote }) => isSameRoute(quote, submittedRoute)) + 1,
  provider_picked: isQuotePicked && isSameRoute(submittedRoute, selectedQuote),
})
