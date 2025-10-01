import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Tabs } from "@talisman/components/Tabs"

const URL_TAB_ASSETS = "assets"
const URL_TAB_DISCOVER = "discover"

interface EarnTabsProps {
  className?: string
  onTabChange?: (tab: string) => void
}

export const EarnTabs: FC<EarnTabsProps> = ({ className, onTabChange }) => {
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = useState(URL_TAB_ASSETS)

  const tabs = useMemo(() => {
    const resTabs = [{ label: t("Earn Assets"), value: URL_TAB_ASSETS }]
    resTabs.push({ label: t("Discover"), value: URL_TAB_DISCOVER })

    return resTabs
  }, [t])

  const handleChange = useCallback(
    (value: string) => {
      setSelectedTab(value)
      onTabChange?.(value)
    },
    [onTabChange],
  )

  return <Tabs tabs={tabs} selected={selectedTab} onChange={handleChange} className={className} />
}
