import { LoaderIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"

export const SignViewBodyShimmer = () => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-2 pt-64 text-body-secondary leading-[140%]">
      <LoaderIcon className="h-16 w-16 animate-spin-slow" />
      <div className="mt-4 font-bold text-base text-white opacity-70">
        {t("Analysing transaction")}
      </div>
      <div className="font-normal text-sm opacity-70">{t("This shouldn't take long...")}</div>
    </div>
  )
}
