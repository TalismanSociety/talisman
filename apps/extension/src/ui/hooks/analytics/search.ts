import type { SearchSurface } from "@common/analytics/portfolio"
import { track } from "@ui/api/track"
import { useEffect, useRef } from "react"

export const SEARCH_SETTLE_MS = 1000

type Pending = { surface: SearchSurface; query: string; resultCount: number }

export const useReportSearch = (surface: SearchSurface, query: string, resultCount: number) => {
  const reported = useRef(new Set<string>())
  const pending = useRef<Pending | null>(null)

  const flush = useRef(() => {
    const search = pending.current
    pending.current = null
    if (!search || reported.current.has(search.query)) return
    reported.current.add(search.query)
    track("search_performed", {
      surface: search.surface,
      query_length: search.query.length,
      result_count: search.resultCount,
    })
  }).current

  useEffect(() => {
    const normalised = query.trim().toLowerCase()
    pending.current = normalised ? { surface, query: normalised, resultCount } : null
    if (!pending.current) return
    const timer = setTimeout(flush, SEARCH_SETTLE_MS)
    return () => clearTimeout(timer)
  }, [surface, query, resultCount, flush])

  useEffect(() => flush, [flush])
}
