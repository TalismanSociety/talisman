import { urlToDomain } from "@core/util/urlToDomain"
import { AlertTriangleIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { FC, useCallback } from "react"
import { Button } from "talisman-ui"

type PhishingPageProps = {
  url: string
}

export const PhishingPage: FC<PhishingPageProps> = ({ url }) => {
  const { val: domain, ok } = urlToDomain(url)

  const allowSite = useCallback(async () => {
    await api.allowPhishingSite(url)
    window.location.replace(url)
  }, [url])

  return (
    <div className="bg-black-tertiary scrollable scrollable-700 flex h-screen max-h-screen flex-col justify-center overflow-auto">
      <div className="bg-black-primary text-body-secondary flex max-w-3xl flex-col gap-16 self-center rounded-lg p-20 text-center">
        <div className="text-[7.7rem]">
          <AlertTriangleIcon className="text-alert-warn" />
        </div>
        <h1 className="text-bold text-alert-warn m-0 text-xl">Warning</h1>
        <div className="text-lg font-light text-white">
          <span className="block">{ok ? domain : url}</span> has been reported as a{" "}
          <span className="text-alert-warn">malicious site</span>
        </div>
        <div className="leading-10">
          This domain has been reported as a known phishing site on a community maintained list.
        </div>
        <div className="w-full">
          <a href="https://app.talisman.xyz">
            <Button className="mb-6 w-full" primary>
              Get me out of here
            </Button>
          </a>
          <div className="text-grey-600 cursor-pointer text-sm leading-8" onClick={allowSite}>
            I trust this site
          </div>
        </div>
      </div>
    </div>
  )
}
