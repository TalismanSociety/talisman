import type { KnownRequestIdOnly } from "@core/libs/requests/types"
import { api } from "@ui/api"
import { AppPill } from "@ui/components/AppPill"
import { Button } from "@ui/components/Button"
import { notify } from "@ui/components/Notifications"
import { NetworkDetailsButton } from "@ui/domains/Ethereum/NetworkDetailsButton"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useBalancesHydrate } from "@ui/state/balances"
import { useNetworkById } from "@ui/state/chaindata"
import { useRequest } from "@ui/state/requests"
import { useCallback, useEffect } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { PopupContent, PopupFooter, PopupHeader, PopupLayout } from "../Layout/PopupLayout"

export const AddEthereumNetwork = () => {
  const { t } = useTranslation()
  useBalancesHydrate() // preload
  const { id } = useParams<"id">() as KnownRequestIdOnly<"eth-network-add">
  const request = useRequest(id)

  useEffect(() => {
    if (!request) window.close()
  }, [request])

  const knownNetwork = useNetworkById(request?.network.id)

  const approve = useCallback(async () => {
    if (!request) return
    try {
      await api.ethNetworkAddApprove(request.id)
      window.close()
    } catch (err) {
      notify({ type: "error", title: t("Failed to add network"), subtitle: (err as Error).message })
    }
  }, [request, t])

  const cancel = useCallback(() => {
    if (!request) return
    api.ethNetworkAddCancel(request.id)
    window.close()
  }, [request])

  if (!request) return null

  return (
    <PopupLayout>
      <PopupHeader>
        <AppPill url={request.url} />
      </PopupHeader>
      <PopupContent>
        <div className="flex h-full w-full flex-col items-center text-center">
          <NetworkLogo networkId={request.network.id} className="mt-6 inline-block text-3xl" />
          <h1 className="mt-8 mb-12 font-bold text-md">{t("Add Network")}</h1>
          <p className="text-body-secondary leading-6.5">
            <Trans t={t}>
              This app wants to connect Talisman to the{" "}
              <span className="inline-block h-6.5 items-center rounded-3xl bg-grey-850 px-3 font-light text-body">
                {request.network.name}
              </span>{" "}
              network.
            </Trans>
          </p>
          {!knownNetwork && (
            <div className="mt-16">
              <NetworkDetailsButton network={request.network} />
            </div>
          )}
          <div className="grow"></div>
        </div>
      </PopupContent>
      <PopupFooter>
        <div className="grid w-full grid-cols-2 gap-8">
          <Button onClick={cancel}>{t("Reject")}</Button>
          <Button primary onClick={approve}>
            {t("Approve")}
          </Button>
        </div>
      </PopupFooter>
    </PopupLayout>
  )
}
