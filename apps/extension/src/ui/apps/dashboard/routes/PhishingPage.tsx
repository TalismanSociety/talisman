import { urlToDomain } from "@core/util/urlToDomain"
import { AlertTriangleIcon, IconAlert } from "@talisman/theme/icons"
import { FC } from "react"
import { Button } from "talisman-ui"

type PhishingPageProps = {
  url: string
}

export const PhishingPage: FC<PhishingPageProps> = ({ url }) => {
  const domain = urlToDomain(url)
  return (
    <div className="bg-black-tertiary scrollable scrollable-700 flex h-screen max-h-screen flex-col justify-center overflow-auto">
      <div className="bg-black-primary text-body-secondary flex max-w-3xl flex-col gap-24 self-center rounded-lg p-20 text-center">
        <h1 className="text-bold m-0 text-lg text-white">Talisman Warning</h1>
        <div className="text-alert-warn text-lg font-light">
          <span className="text-white">{domain}</span> has been reported as a malicious site
        </div>
        <div className="text-[7.7rem]">
          <AlertTriangleIcon className="text-alert-warn" />
        </div>
        <div className="leading-10">
          This domain has been reported as a known phishing site on a community maintained list.
        </div>
        <Button className="w-full" onClick={() => window.close()}>
          Close
        </Button>
      </div>
    </div>
  )
}
