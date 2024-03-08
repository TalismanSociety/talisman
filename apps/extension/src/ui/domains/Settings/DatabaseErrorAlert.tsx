import { errorsStore } from "@extension/core"
import { Card } from "@talisman/components/Card"
import { AlertCircleIcon, DatabaseIcon } from "@talismn/icons"
import { AnalyticsPage } from "@ui/api/analytics"
import { useErrorsStoreValue } from "@ui/hooks/useErrors"
import { useRuntimeReload } from "@ui/hooks/useRuntimeReload"
import { useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

const ANALYTICS_PAGES: Record<"popup" | "fullscreen", AnalyticsPage> = {
  popup: {
    container: "Popup",
    feature: "Portfolio",
    featureVersion: 1,
    page: "Database Unavailable",
  },
  fullscreen: {
    container: "Fullscreen",
    feature: "Portfolio",
    featureVersion: 1,
    page: "Database Unavailable",
  },
}

export type Props = {
  container: keyof typeof ANALYTICS_PAGES
}

export const DatabaseErrorAlert = ({ container }: Props) => {
  const { t } = useTranslation()

  const [databaseUnavailable] = useErrorsStoreValue("databaseUnavailable")
  const [databaseQuotaExceeded] = useErrorsStoreValue("databaseQuotaExceeded")
  const isOpen = databaseUnavailable || databaseQuotaExceeded

  const [hasRuntimeReloadFn, runtimeReload] = useRuntimeReload(
    useMemo(() => ANALYTICS_PAGES[container], [container])
  )
  const dismiss = useCallback(
    () => errorsStore.set({ databaseUnavailable: false, databaseQuotaExceeded: false }),
    []
  )

  if (!isOpen) return null
  return (
    <div className="absolute bottom-0 right-0 m-8 max-w-full">
      <Card
        className="text-body-secondary text-center"
        title={
          <div className="flex flex-col items-center">
            <div className="relative">
              <DatabaseIcon className="icon text-3xl text-white" />
              <AlertCircleIcon className="icon bg-alert-error text-md absolute right-0 top-0 rounded text-white" />
            </div>
            <div className="text-body mt-4">{t("Database Unavailable")}</div>
          </div>
        }
        description={
          <>
            <div className="mb-4 text-sm">
              {hasRuntimeReloadFn
                ? t(
                    "Please make sure there is free space on your disk (at least 1GB) and then reload Talisman."
                  )
                : t(
                    "Please make sure there is free space on your disk (at least 1GB) and then restart your browser."
                  )}
            </div>
            <div className="text-sm">
              <Trans t={t}>
                If this problem continues, please contact our support team on{" "}
                <a
                  className="text-body underline"
                  href="https://discord.gg/talisman"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Discord
                </a>
                .
              </Trans>
            </div>
          </>
        }
        cta={
          <div className="flex flex-col gap-4">
            {hasRuntimeReloadFn ? (
              <Button className="w-full" primary fullWidth small onClick={runtimeReload}>
                {t("Reload Talisman")}
              </Button>
            ) : null}
            <button
              className="hover:text-body focus:text-body self-center p-4 text-xs"
              onClick={dismiss}
            >
              Dismiss
            </button>
          </div>
        }
      />
    </div>
  )
}
