import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useLocation } from "react-router-dom"

import { Tabs } from "@talisman/components/Tabs"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"

const URL_TAB_TOKENS = "/portfolio/tokens"
const URL_TAB_NFTS = "/portfolio/nfts"
const URL_TAB_DEFI = "/portfolio/defi"

export const PortfolioTabs: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigateWithQuery()

  const tabs = useMemo(
    () => [
      { label: t("Tokens"), value: URL_TAB_TOKENS },
      { label: t("NFTs"), value: URL_TAB_NFTS },
      { label: t("DeFi"), value: URL_TAB_DEFI },
    ],
    [t],
  )

  const selected = useMemo(
    () => tabs.find((tab) => location.pathname.startsWith(tab.value)),
    [location.pathname, tabs],
  )

  const handleChange = useCallback(
    (value: string) => {
      navigate(`${value}`)
    },
    [navigate],
  )

  return (
    <Tabs tabs={tabs} selected={selected?.value} onChange={handleChange} className={className} />
  )
}
