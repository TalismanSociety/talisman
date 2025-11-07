import { createContext, ReactNode, useCallback, useContext, useState } from "react"

interface EarnAssetsState {
  isDefiExpanded: boolean
  expandedTokens: Set<string>
  setIsDefiExpanded: (value: boolean | ((prev: boolean) => boolean)) => void
  toggleDefiExpanded: () => void
  toggleTokenExpanded: (tokenSymbol: string) => void
}

const EarnAssetsStateContext = createContext<EarnAssetsState | null>(null)

export const EarnAssetsStateProvider = ({ children }: { children: ReactNode }) => {
  const [isDefiExpanded, setIsDefiExpanded] = useState(true)
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set())

  const toggleDefiExpanded = useCallback(() => {
    setIsDefiExpanded((prev) => !prev)
  }, [])

  const toggleTokenExpanded = useCallback((tokenSymbol: string) => {
    setExpandedTokens((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(tokenSymbol)) {
        newSet.delete(tokenSymbol)
      } else {
        newSet.add(tokenSymbol)
      }
      return newSet
    })
  }, [])

  return (
    <EarnAssetsStateContext.Provider
      value={{
        isDefiExpanded,
        expandedTokens,
        setIsDefiExpanded,
        toggleDefiExpanded,
        toggleTokenExpanded,
      }}
    >
      {children}
    </EarnAssetsStateContext.Provider>
  )
}

export const useEarnAssetsState = () => {
  const context = useContext(EarnAssetsStateContext)
  if (!context) {
    throw new Error("useEarnAssetsState must be used within EarnAssetsStateProvider")
  }
  return context
}
