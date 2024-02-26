import { KnownRequestIdOnly } from "@core/libs/requests/types"
import { AppPill } from "@talisman/components/AppPill"
import { notify } from "@talisman/components/Notifications"
import { GlobeIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { balancesHydrateAtom } from "@ui/atoms"
import { NetworksDetailsButton } from "@ui/domains/Ethereum/NetworkDetailsButton"
import { useRequest } from "@ui/hooks/useRequest"
import { useAtomValue } from "jotai"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { Button } from "talisman-ui"

import { PopupContent, PopupFooter, PopupHeader, PopupLayout } from "../Layout/PopupLayout"

export const AddEthereumNetwork = () => {
  const { t } = useTranslation("request")
  useAtomValue(balancesHydrateAtom)
  const { id } = useParams<"id">() as KnownRequestIdOnly<"eth-network-add">
  const request = useRequest(id)

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

  const chainName = request.network.chainName

  return (
    <PopupLayout>
      <PopupHeader>
        <AppPill url={request.url} />
      </PopupHeader>
      <PopupContent>
        <div className="flex h-full w-full flex-col items-center text-center">
          <GlobeIcon className="globeIcon text-primary mt-6 inline-block text-3xl" />
          <h1 className="text-md mb-12 mt-8 font-bold">{t("Add Network")}</h1>
          <p className="text-body-secondary leading-[2.6rem]">
            <Trans t={t}>
              This app wants to connect Talisman to the{" "}
              <span className="bg-grey-850 text-body inline-block h-[2.6rem] items-center rounded-3xl px-3 font-light">
                {chainName}
              </span>{" "}
              network.
            </Trans>
          </p>
          <div className="mt-16">
            <NetworksDetailsButton network={request.network} />
          </div>
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
