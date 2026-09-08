import { useSwap } from "../SwapProvider"

export const QuoteNote = () => {
  const { selectedQuote } = useSwap()

  if (!selectedQuote?.note) return null

  return <div className="text-body-secondary text-xs">{selectedQuote.note}</div>
}
