import { ChevronLeftIcon } from "@talismn/icons"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Drawer, Dropdown, IconButton } from "talisman-ui"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { useSetting } from "@ui/state"

export const useAutoLockDrawerOpenClose = () => useGlobalOpenClose("auto-lock-drawer")

const AutoLockEditor = () => {
  const { t } = useTranslation()
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
    <Dropdown
      items={options}
      value={value}
      propertyKey="value"
      propertyLabel="label"
      onChange={handleChange}
    />
  )
}

type Option = { value: number; label: string }

const AutoLockDrawerContent = () => {
  const { t } = useTranslation()
  const { close } = useAutoLockDrawerOpenClose()

  return (
    <div className="text-body-secondary flex h-[60rem] w-[40rem] flex-col gap-10 bg-black pt-10">
      <div className="flex items-center gap-3 px-8 text-base font-bold text-white">
        <IconButton onClick={close}>
          <ChevronLeftIcon />
        </IconButton>
        <div>{t("Auto-lock Timer")}</div>
      </div>
      <div className="px-8 text-sm">
        <p>{t("Lock the Talisman extension after inactivity for")}</p>
        <div className="h-4"></div>
        <AutoLockEditor />
      </div>
    </div>
  )
}

export const AutoLockDrawer = () => {
  const { isOpen } = useAutoLockDrawerOpenClose()

  return (
    <Drawer anchor="right" isOpen={isOpen} containerId="main">
      <AutoLockDrawerContent />
    </Drawer>
  )
}
