import { FC, ReactNode } from "react"

interface DepositProviderProps {
  children: ReactNode
}

export const DepositProvider: FC<DepositProviderProps> = ({ children }) => {
  // This provider can be used to wrap components that need access to deposit state
  // For now, it's just a pass-through, but could be extended with additional context
  return <>{children}</>
}
