import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Dropdown } from "talisman-ui"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { useSetting } from "@ui/state"

import { DashboardLayout } from "../../layout"

type Option = { value: number; label: string }

export const Content = () => {
  const { t } = useTranslation("admin")
  const [autoLockTimeout, setAutoLockTimeout] = useSetting("autoLockMinutes")

  const options: Option[] = useMemo(
    () => [
      { value: 0, label: t("Disabled") },
      { value: 5, label: t("{{count}} minutes", { count: 5 }) },
      { value: 15, label: t("{{count}} minutes", { count: 15 }) },
      { value: 30, label: t("{{count}} minutes", { count: 30 }) },
      { value: 60, label: t("{{count}} minutes", { count: 60 }) },
    ],
    [t],
  )

  const handleChange = useCallback(
    (val: Option | null) => {
      const newVal = val?.value || 0
      if (newVal !== autoLockTimeout) setAutoLockTimeout(newVal)
    },
    [autoLockTimeout, setAutoLockTimeout],
  )

  const value = useMemo(
    () => options.find((o) => o.value === (autoLockTimeout ?? 0)),
    [autoLockTimeout, options],
  )

  return (
    <>
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
    </>
  )
}

export const AutoLockTimerPage = () => (
  <DashboardLayout sidebar="settings" width="660">
    <Content />
  </DashboardLayout>
)
