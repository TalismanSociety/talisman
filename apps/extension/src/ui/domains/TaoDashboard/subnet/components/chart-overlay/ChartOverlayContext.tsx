import {
  createContext,
  type FC,
  type PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from "react"
import type { WhaleTransaction } from "../../../hooks/useSn45Api"

export type HoveredItem = {
  type: "whale"
  timestamp: number
  tx: WhaleTransaction
  taoUsdPrice?: number
  taoDecimals: number
}

type SetHoveredItem = (item: HoveredItem | null) => void

// Split contexts: producers use setter (stable ref), consumer uses value (changes on hover)
const ChartOverlayValueContext = createContext<HoveredItem | null>(null)
const ChartOverlaySetterContext = createContext<SetHoveredItem>(() => {})

export const ChartOverlayProvider: FC<PropsWithChildren> = ({ children }) => {
  const [hoveredItem, setHoveredItem] = useState<HoveredItem | null>(null)
  const stableSetter = useCallback<SetHoveredItem>((item) => setHoveredItem(item), [])

  return (
    <ChartOverlaySetterContext.Provider value={stableSetter}>
      <ChartOverlayValueContext.Provider value={hoveredItem}>
        {children}
      </ChartOverlayValueContext.Provider>
    </ChartOverlaySetterContext.Provider>
  )
}

/** Used by ChartOverlay (consumer) to read the hovered item. */
export const useChartOverlayItem = () => useContext(ChartOverlayValueContext)

/** Used by sidebar items (producers) to set the hovered item. Stable reference — won't cause re-renders. */
export const useSetChartOverlay = () => useContext(ChartOverlaySetterContext)
