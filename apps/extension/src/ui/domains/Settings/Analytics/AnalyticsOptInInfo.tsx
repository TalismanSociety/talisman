import { PRIVACY_POLICY_URL } from "@extension/shared"
import { CheckCircleIcon, XIcon } from "@talismn/icons/"
import { classNames } from "@talismn/util"
import { FC, ReactNode } from "react"
import { Trans, useTranslation } from "react-i18next"

const TickYes = () => <CheckCircleIcon className="text-md text-primary mr-6" />

const TickNo = () => <XIcon className="text-md text-brand-orange mr-6" />

export const AnalyticsOptInInfo: FC<{
  className?: string
  children?: ReactNode
}> = ({ className, children }) => {
  const { t } = useTranslation("admin")

  return (
    <div className={classNames("flex flex-col gap-12", className)}>
      <h1 className="mb-4">{t("Help us improve Talisman")}</h1>
      <p className="text-body-secondary">
        {t(
          "We want to build simple tools that empower our users and allow them navigate web3 applications with ease. To help improve our product and features we'd like to collect anonymous usage information. This is optional, and you can opt-out at any time."
        )}
      </p>
      <div>
        <h3 className="mb-4">{t("What we track")}</h3>
        <ul className="text-body-secondary m-0 list-none pl-0 [&>li]:flex [&>li]:items-center">
          <li>
            <TickYes />
            {t("Anonymous user data")}
          </li>
          <li>
            <TickYes />
            {t("Basic UI metrics")}
          </li>
        </ul>
      </div>
      <div>
        <h3 className="mb-4">{t("What we don't track")}</h3>
        <ul className="text-body-secondary m-0 list-none pl-0 [&>li]:flex [&>li]:items-center">
          <li>
            <TickNo />
            {t("Identifying personal data such as IP addresses")}
          </li>
          <li>
            <TickNo />
            {t("Recovery phrases or private keys")}
          </li>
          <li>
            <TickNo />
            {t("Public addresses")}
          </li>
        </ul>
      </div>
      {children}
      <div className="text-body-secondary text-sm">
        <Trans t={t}>
          For more information please read our{" "}
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-grey-300 active:text-grey-300 underline"
          >
            Privacy Policy
          </a>
        </Trans>
      </div>
    </div>
  )
}
