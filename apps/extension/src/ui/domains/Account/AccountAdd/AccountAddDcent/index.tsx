import { DISCORD_TALISMAN_URL } from "extension-shared"
import { Trans, useTranslation } from "react-i18next"

export const AccountAddDcentDisabledMessage = () => {
  const { t } = useTranslation()
  return (
    <>
      <h2 className="">{t("D'CENT support is currently unavailable")}</h2>
      <p className="text-body-secondary">
        <Trans t={t}>
          For more information, please contact our support team on{" "}
          <a
            className="text-body underline"
            href={DISCORD_TALISMAN_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            Discord
          </a>
          .
        </Trans>
      </p>
    </>
  )
}
