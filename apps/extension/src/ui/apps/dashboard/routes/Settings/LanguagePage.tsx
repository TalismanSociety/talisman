import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { languages } from "@common/i18nConfig"
import { ExclusiveButtonsList } from "@talisman/components/ExclusiveButtonsList"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"

import { DashboardLayout } from "../../layout"

const Content = () => {
  const { t, i18n } = useTranslation()

  const options = useMemo(
    () => Object.entries(languages).map(([value, label]) => ({ value, label })),
    [],
  )

  return (
    <>
      <HeaderBlock title={t("Language")} text={t("Choose your preferred language")} />
      <Spacer />
      <ExclusiveButtonsList
        options={options}
        value={i18n.language}
        onChange={i18n.changeLanguage}
      />
      <Spacer />
    </>
  )
}

export const LanguagePage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
