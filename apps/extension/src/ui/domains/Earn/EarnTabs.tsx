import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Tabs } from "@talisman/components/Tabs"

interface EarnTabsProps {
  className?: string
  onTabChange: (tab: "assets" | "discover") => void
  value: "assets" | "discover"
}

export const EarnTabs: FC<EarnTabsProps> = ({ className, onTabChange, value = "assets" }) => {
  const { t } = useTranslation()

  const tabs = useMemo(() => {
    const resTabs = [{ label: t("Earn Assets"), value: "assets" }]
    resTabs.push({ label: t("Discover"), value: "discover" })

    return resTabs
  }, [t])

  const handleChange = useCallback(
    (value: string) => {
      if (value !== "assets" && value !== "discover") return
      onTabChange?.(value)
    },
    [onTabChange],
  )

  return <Tabs tabs={tabs} selected={value} onChange={handleChange} className={className} />
}
