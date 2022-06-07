import { provideContext } from "@talisman/util/provideContext"
import { useState } from "react"

const useDashboardProvider = () => {
  const [accountId, setAccountId] = useState<string>()

  return { accountId, setAccountId }
}

export const [DashboardProvider, useDashboard] = provideContext(useDashboardProvider)
