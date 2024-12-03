import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { ExclusiveButtonsList } from "@talisman/components/ExclusiveButtonsList"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { useSetting } from "@ui/state"

import { DashboardLayout } from "../../layout"

type Option = { value: number; label: string }

export const Content = () => {
  const { t } = useTranslation()
  const [autoLockTimeout, setAutoLockTimeout] = useSetting("autoLockMinutes")

  const options: Option[] = useMemo(
    () => [
      { value: 0, label: t("Disabled") },
      { value: 1, label: t("{{count}} minute", { count: 1 }) },
      { value: 5, label: t("{{count}} minutes", { count: 5 }) },
      { value: 15, label: t("{{count}} minutes", { count: 15 }) },
      { value: 30, label: t("{{count}} minutes", { count: 30 }) },
      { value: 60, label: t("{{count}} minutes", { count: 60 }) },
    ],
    [t],
  )

  return (
    <>
      <HeaderBlock
        title={t("Auto-lock Timer")}
        text={t(
          "Set a timer to automatically lock the Talisman wallet extension after the following period of inactivity",
        )}
      />
      <Spacer />
      <ExclusiveButtonsList
        options={options}
        value={autoLockTimeout}
        onChange={setAutoLockTimeout}
      />
      <Spacer />
    </>
  )
}

export const AutoLockTimerPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
