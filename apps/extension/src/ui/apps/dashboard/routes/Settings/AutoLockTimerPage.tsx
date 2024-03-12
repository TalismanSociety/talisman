import { SettingsStoreData } from "@extension/core"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { useSetting } from "@ui/hooks/useSettings"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Dropdown } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

type AllowedValues = SettingsStoreData["autoLockTimeout"]
type Option = { value: AllowedValues; label: string }

export const AutoLockTimerPage = () => {
  const { t } = useTranslation("admin")
  const [autoLockTimeout, setAutoLockTimeout] = useSetting("autoLockTimeout")

  const options: Option[] = useMemo(
    () => [
      { value: 0, label: t("Disabled") },
      { value: 300, label: t("{{count}} minutes", { count: 5 }) },
      { value: 900, label: t("{{count}} minutes", { count: 15 }) },
      { value: 1800, label: t("{{count}} minutes", { count: 30 }) },
      { value: 3600, label: t("{{count}} minutes", { count: 60 }) },
    ],
    [t]
  )

  const handleChange = useCallback(
    (val: Option | null) => {
      const newVal = val?.value || 0
      if (newVal !== autoLockTimeout) setAutoLockTimeout(newVal)
    },
    [autoLockTimeout, setAutoLockTimeout]
  )

  const value = useMemo(
    () => options.find((o) => o.value === (autoLockTimeout ?? 0)),
    [autoLockTimeout, options]
  )

  return (
    <DashboardLayout centered withBack>
      <HeaderBlock
        title="Auto-lock Timer"
        text="Set a timer to automatically lock the Talisman wallet extension."
      />
      <Spacer />
      <Dropdown
        label={t("Lock the Talisman extension after inactivity for")}
        items={options}
        value={value}
        propertyKey="value"
        propertyLabel="label"
        onChange={handleChange}
      />
      <Spacer />
    </DashboardLayout>
  )
}
