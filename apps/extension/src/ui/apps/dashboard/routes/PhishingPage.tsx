import { TALISMAN_WEB_APP_URL } from "@common/constants"
import { AlertTriangleIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { TalismanWhiteLogo } from "@ui/theme/logos"
import { type FC, useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

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
    } catch {
      return url
    }
  }, [url])

  return (
    <div className="max-h-screen bg-black-tertiary">
      <div className="flex h-screen flex-col items-center justify-center">
        <TalismanWhiteLogo className="my-16 h-16 w-4/12" />
        <div className="flex flex-grow items-center">
          <div className="scrollable scrollable-700 flex flex-col overflow-auto">
            <div className="flex max-w-3xl flex-col items-center gap-16 self-center rounded-lg bg-black-primary p-20 text-center text-body-secondary">
              <AlertTriangleIcon className="inline-block text-[7.7rem] text-alert-warn" />
              <h1 className="m-0 text-alert-warn text-bold text-xl">{t("Warning")}</h1>
              <div className="font-light text-lg text-white">
                <Trans t={t}>
                  <span className="block break-all">{displayUrl}</span> has been reported as a{" "}
                  <span className="block text-alert-warn">malicious site</span>
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
                  className="cursor-pointer text-grey-600 text-sm leading-8 hover:text-body-secondary"
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
