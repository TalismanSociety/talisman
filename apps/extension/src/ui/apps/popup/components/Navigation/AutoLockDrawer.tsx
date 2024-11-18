import { ChevronLeftIcon } from "@talismn/icons"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Drawer, IconButton } from "talisman-ui"

import { ExclusiveButtonsList } from "@talisman/components/ExclusiveButtonsList"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { useSetting } from "@ui/state"

export const useAutoLockDrawerOpenClose = () => useGlobalOpenClose("auto-lock-drawer")

const AutoLockEditor = () => {
  const { t } = useTranslation()
  const { close } = useAutoLockDrawerOpenClose()
  const [autoLockTimeout, setAutoLockTimeout] = useSetting("autoLockMinutes")

  const options = useMemo(
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

  const handleChange = useCallback(
    (value: number) => {
      setAutoLockTimeout(value)
      close()
    },
    [close, setAutoLockTimeout],
  )

  return <ExclusiveButtonsList options={options} value={autoLockTimeout} onChange={handleChange} />
}

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

      <div className="px-8">
        <p className="text-xs">
          {t(
            "Set a timer to automatically lock the Talisman wallet extension after the following period of inactivity",
          )}
        </p>
      </div>
      <ScrollContainer className="grow" innerClassName="px-8 pb-8">
        <AutoLockEditor />
      </ScrollContainer>
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
