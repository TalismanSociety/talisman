import { ChevronLeftIcon } from "@talismn/icons"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Drawer, IconButton } from "talisman-ui"

import { languages } from "@common/i18nConfig"
import { ExclusiveButtonsList } from "@talisman/components/ExclusiveButtonsList"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

export const useLanguageDrawerOpenClose = () => useGlobalOpenClose("language-drawer")

const LanguagesList = () => {
  const { i18n } = useTranslation()
  const { close } = useLanguageDrawerOpenClose()

  const options = useMemo(
    () => Object.entries(languages).map(([value, label]) => ({ value, label })),
    [],
  )

  const handleLanguageClick = useCallback(
    (lang: string) => {
      i18n.changeLanguage(lang ?? "en")
      close()
    },
    [close, i18n],
  )

  return (
    <ExclusiveButtonsList options={options} value={i18n.language} onChange={handleLanguageClick} />
  )
}

const LanguageDrawerContent = () => {
  const { t } = useTranslation()
  const { close } = useLanguageDrawerOpenClose()

  return (
    <div className="text-body-secondary flex h-[60rem] w-[40rem] flex-col gap-10 bg-black pt-10">
      <div className="flex items-center gap-3 px-8 text-base font-bold text-white">
        <IconButton onClick={close}>
          <ChevronLeftIcon />
        </IconButton>
        <div>{t("Language")}</div>
      </div>
      <div className="px-8">
        <p className="text-xs">{t("Choose your preferred language")}</p>
      </div>
      <ScrollContainer className="grow" innerClassName="px-8 pb-8">
        <LanguagesList />
      </ScrollContainer>
    </div>
  )
}

export const LanguageDrawer = () => {
  const { isOpen } = useLanguageDrawerOpenClose()

  return (
    <Drawer anchor="right" isOpen={isOpen} containerId="main">
      <LanguageDrawerContent />
    </Drawer>
  )
}
