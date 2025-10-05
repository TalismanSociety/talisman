import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Tabs } from "@talisman/components/Tabs"

interface PopupEarnTabsProps {
  onTabChange?: (tab: string) => void
}

export const PopupEarnTabs: FC<PopupEarnTabsProps> = ({ onTabChange }) => {
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = useState("assets")

  const tabs = useMemo(() => {
    return [
      { label: t("Earn Assets"), value: "assets" },
      { label: t("Discover"), value: "discover" },
    ]
  }, [t])

  const handleChange = useCallback(
    (value: string) => {
      setSelectedTab(value)
      onTabChange?.(value)
    },
    [onTabChange],
  )

  return <Tabs tabs={tabs} selected={selectedTab} onChange={handleChange} />
}
