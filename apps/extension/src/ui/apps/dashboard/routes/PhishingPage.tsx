import { TALISMAN_WEB_APP_URL } from "@extension/shared"
import { TalismanWhiteLogo } from "@talisman/theme/logos"
import { AlertTriangleIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { FC, useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

type PhishingPageProps = {
  url: string
}

export const PhishingPage: FC<PhishingPageProps> = ({ url }) => {
  const { t } = useTranslation()
  const allowSite = useCallback(async () => {
    await api.allowPhishingSite(url)
    window.location.replace(url)
  }, [url])

  const displayUrl = useMemo(() => {
    try {
      return new URL(url).origin
    } catch (err) {
      return url
    }
  }, [url])

  return (
    <div className="bg-black-tertiary max-h-screen">
      <div className="flex h-screen flex-col items-center justify-center">
        <TalismanWhiteLogo className="my-16 h-16 w-4/12" />
        <div className="flex flex-grow items-center">
          <div className="scrollable scrollable-700 flex flex-col overflow-auto">
            <div className="bg-black-primary text-body-secondary flex max-w-3xl flex-col items-center gap-16 self-center rounded-lg p-20 text-center">
              <AlertTriangleIcon className="text-alert-warn inline-block text-[7.7rem]" />
              <h1 className="text-bold text-alert-warn m-0 text-xl">{t("Warning")}</h1>
              <div className="text-lg font-light text-white">
                <Trans t={t}>
                  <span className="block break-all">{displayUrl}</span> has been reported as a{" "}
                  <span className="text-alert-warn block">malicious site</span>
                </Trans>
              </div>
              <div className="leading-10">
                <Trans t={t}>
                  This domain has been reported as a known phishing site on a community maintained
                  list.
                </Trans>
              </div>
              <div className="w-full">
                <a href={TALISMAN_WEB_APP_URL}>
                  <Button className="mb-6 w-full" primary>
                    {t("Get me out of here")}
                  </Button>
                </a>
                <button
                  type="button"
                  className="text-grey-600 hover:text-body-secondary cursor-pointer text-sm leading-8"
                  onClick={allowSite}
                >
                  {t("I trust this site")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
