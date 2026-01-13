import { Tabs } from "@talisman/components/Tabs"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

const EARN_TAB_KEYS = ["assets", "discover", "bittensor"] as const

export type EarnTabsKey = (typeof EARN_TAB_KEYS)[number]

const isEarnTabsKey = (key: string): key is EarnTabsKey => {
  return EARN_TAB_KEYS.includes(key as EarnTabsKey)
}

interface EarnTabsProps {
  className?: string
  onTabChange: (tab: EarnTabsKey) => void
  value: EarnTabsKey
}

export const EarnTabs: FC<EarnTabsProps> = ({ className, onTabChange, value = "assets" }) => {
  const { t } = useTranslation()

  const tabs = useMemo(
    () => [
      { label: t("Positions"), value: "assets" },
      { label: t("Discover"), value: "discover" },
      { label: t("Bittensor"), value: "bittensor" },
    ],
    [t]
  )

  const handleChange = useCallback(
    (value: string) => {
      if (!isEarnTabsKey(value)) return
      onTabChange?.(value)
    },
    [onTabChange]
  )

  return <Tabs tabs={tabs} selected={value} onChange={handleChange} className={className} />
}
