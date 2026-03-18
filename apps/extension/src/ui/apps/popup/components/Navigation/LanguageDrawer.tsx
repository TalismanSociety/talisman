import { languages } from "@common/i18nConfig"
import { ChevronLeftIcon } from "@talismn/icons"
import { Drawer } from "@ui/components/Drawer"
import { ExclusiveButtonsList } from "@ui/components/ExclusiveButtonsList"
import { IconButton } from "@ui/components/IconButton"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { useGlobalOpenClose } from "@ui/hooks/useGlobalOpenClose"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

export const useLanguageDrawerOpenClose = () => useGlobalOpenClose("language-drawer")

const LanguagesList = () => {
  const { i18n } = useTranslation()
  const { close } = useLanguageDrawerOpenClose()

  const options = useMemo(
    () => Object.entries(languages).map(([value, label]) => ({ value, label })),
    []
  )

  const handleLanguageClick = useCallback(
    (lang: string) => {
      i18n.changeLanguage(lang ?? "en")
      close()
    },
    [close, i18n]
  )

  return (
    <ExclusiveButtonsList options={options} value={i18n.language} onChange={handleLanguageClick} />
  )
}

const LanguageDrawerContent = () => {
  const { t } = useTranslation()
  const { close } = useLanguageDrawerOpenClose()

  return (
    <div className="flex h-[37.5rem] w-[25rem] flex-col gap-10 bg-black pt-10 text-body-secondary">
      <div className="flex items-center gap-3 px-8 font-bold text-base text-white">
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
