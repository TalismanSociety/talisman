import { Tabs } from "@talisman/components/Tabs"
import { FC, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { useSelectedAccount } from "./useSelectedAccount"

export const PortfolioTabs: FC<{ className?: string }> = ({ className }) => {
  const { account, accounts } = useSelectedAccount()
  const location = useLocation()
  const navigate = useNavigate()

  const tabs = useMemo(() => {
    const withNfts = account
      ? account.type === "ethereum"
      : accounts.some((account) => account.type === "ethereum")

    return [
      { label: "Tokens", value: "/portfolio/tokens" },
      { label: "NFTs", value: "/portfolio/nfts", disabled: !withNfts },
    ]
  }, [account, accounts])

  const selected = useMemo(
    () => tabs.find((tab) => location.pathname.startsWith(tab.value)),
    [location.pathname, tabs]
  )

  return <Tabs tabs={tabs} selected={selected?.value} onChange={navigate} className={className} />
}
