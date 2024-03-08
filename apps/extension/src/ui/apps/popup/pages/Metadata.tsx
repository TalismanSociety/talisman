import { KnownRequestIdOnly } from "@extension/core"
import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useRequest } from "@ui/hooks/useRequest"
import { FC, useCallback, useEffect, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { Button } from "talisman-ui"

import { PopupContent, PopupFooter, PopupHeader, PopupLayout } from "../Layout/PopupLayout"

export const Metadata: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation("request")
  const { id } = useParams<"id">() as KnownRequestIdOnly<"metadata">
  const metadataRequest = useRequest(id)
  const { popupOpenEvent } = useAnalytics()
  useEffect(() => {
    popupOpenEvent("metadata")
  }, [popupOpenEvent])

  const approve = useCallback(async () => {
    if (!metadataRequest) return
    try {
      await api.approveMetaRequest(metadataRequest.id)
      window.close()
    } catch (err) {
      notify({ type: "error", title: "Failed to update", subtitle: (err as Error).message })
    }
  }, [metadataRequest])

  const reject = useCallback(() => {
    if (!metadataRequest) return
    api.rejectMetaRequest(metadataRequest.id)
    window.close()
  }, [metadataRequest])

  const displayUrl = useMemo(
    () =>
      metadataRequest?.url
        ? new URL(metadataRequest?.url || "").origin // use origin to keep the prefixed protocol
        : metadataRequest?.url ?? "",
    [metadataRequest?.url]
  )

  if (!metadataRequest) return null

  const { request } = metadataRequest

  return (
    <PopupLayout className={className}>
      <PopupHeader>{t("Update Metadata")}</PopupHeader>
      <PopupContent>
        <div>
          <div className="px-4 text-center">
            <h1 className="my-8 text-lg">{t("Your metadata is out of date")}</h1>
            <p className="text-body-secondary mt-16">
              <Trans t={t}>
                Approving this update will sync your metadata for the{" "}
                <span className="text-body">{request.chain}</span> chain
              </Trans>
              {displayUrl && (
                <>
                  {" "}
                  <Trans t={t}>
                    from <span className="text-body">{displayUrl}</span>
                  </Trans>
                </>
              )}
            </p>
          </div>
          <hr className="text-grey-700 my-20" />
          <div className="text-left">
            <div className="ml-16 inline-grid grid-cols-2 gap-x-8 gap-y-2">
              <div className="text-body-secondary">{t("Symbol:")}</div>
              <div>{request.tokenSymbol}</div>
              <div className="text-body-secondary">{t("Decimals:")}</div>
              <div>{request.tokenDecimals}</div>
            </div>
          </div>
        </div>
      </PopupContent>
      <PopupFooter>
        <div className="grid grid-cols-2 gap-12">
          <Button onClick={reject}>{t("Cancel")}</Button>
          <Button primary onClick={approve}>
            {t("Approve")}
          </Button>
        </div>
      </PopupFooter>
    </PopupLayout>
  )
}
