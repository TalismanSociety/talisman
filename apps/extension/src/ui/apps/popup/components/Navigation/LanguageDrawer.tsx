import { CheckIcon, ChevronLeftIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Drawer, IconButton } from "talisman-ui"

import { languages } from "@common/i18nConfig"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

export const useLanguageDrawerOpenClose = () => useGlobalOpenClose("language-drawer")

type Language = keyof typeof languages

const LanguageButton: FC<{
  displayName: string
  selected: boolean
  onClick: () => void
}> = ({ displayName, selected, onClick }) => {
  return (
    <button
      type="button"
      className={classNames(
        "text-body-secondary flex h-28 w-full items-center justify-between gap-4 rounded-sm px-6",
        "border-grey-800 border",
        selected && "bg-grey-900 text-body",
        "hover:border-grey-700 hover:bg-grey-800 stroke-primary",
      )}
      onClick={onClick}
    >
      <div>{displayName}</div>
      {!!selected && <CheckIcon className="text-primary size-8" />}
    </button>
  )
}

const LanguagesList = () => {
  const { i18n } = useTranslation()
  const { close } = useLanguageDrawerOpenClose()

  const currentLang = useMemo(() => i18n.language, [i18n.language])

  const handleLanguageClick = useCallback(
    (lang: Language) => () => {
      i18n.changeLanguage(lang ?? "en")
      close()
    },
    [close, i18n],
  )

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(languages).map(([lang, displayName]) => (
        <LanguageButton
          key={lang}
          displayName={displayName}
          selected={lang === currentLang}
          onClick={handleLanguageClick(lang)}
        />
      ))}
    </div>
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
