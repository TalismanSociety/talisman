import { FC, ReactNode } from "react"

import { WithdrawWizardProvider } from "../context/WithdrawWizardContext"

interface WithdrawProviderProps {
  children: ReactNode
}

export const WithdrawProvider: FC<WithdrawProviderProps> = ({ children }) => {
  return <WithdrawWizardProvider>{children}</WithdrawWizardProvider>
}
