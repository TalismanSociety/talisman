import { languages } from "@common/i18nConfig"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { CheckIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"

import { DashboardLayout } from "../../layout/DashboardLayout"

const LanguageButton = ({
  displayName,
  lang,
  isCurrent,
  onClick,
}: {
  displayName: string
  lang?: keyof typeof languages
  isCurrent?: boolean
  onClick?: (lang?: keyof typeof languages) => void
}) => (
  <button
    type="button"
    key={lang}
    className="bg-grey-900 enabled:hover:bg-grey-800 text-body-disabled enabled:hover:text-body flex h-28 w-full cursor-pointer items-center gap-8 rounded-sm px-8 disabled:cursor-not-allowed disabled:opacity-50"
    onClick={() => onClick && onClick(lang)}
  >
    <div className="flex grow flex-col items-start gap-4">
      <div className="text-body">{displayName}</div>
    </div>
    {isCurrent && <CheckIcon className="text-lg" />}
  </button>
)

export const LanguagePage = () => {
  const { t, i18n } = useTranslation("admin")

  const currentLang = i18n.language
  const changeLang = (lang?: keyof typeof languages) => lang && i18n.changeLanguage(lang)

  return (
    <DashboardLayout centered withBack backTo="/settings/general">
      <HeaderBlock title={t("Language")} text={t("Choose your preferred language")} />
      <Spacer />
      <div className="flex flex-col gap-4">
        {/* Fallback for unknown languages ( Shouldn't happen, but hey ¯\_(ツ)_/¯ ) */}
        {!Object.keys(languages).includes(currentLang) && (
          <LanguageButton displayName={t("Unknown")} isCurrent />
        )}

        {/* List of languages */}
        {Object.entries(languages).map(([lang, displayName]) => (
          <LanguageButton
            key={lang}
            lang={lang as keyof typeof languages}
            displayName={displayName}
            isCurrent={lang === currentLang}
            onClick={changeLang}
          />
        ))}
      </div>
    </DashboardLayout>
  )
}
