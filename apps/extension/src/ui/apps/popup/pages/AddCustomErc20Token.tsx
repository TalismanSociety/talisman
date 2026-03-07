import { IS_FIREFOX, UNKNOWN_TOKEN_URL } from "@common/constants"
import type { WatchAssetRequestIdOnly } from "@core/domains/ethereum/types"
import { AppPill } from "@talisman/components/AppPill"
import { api } from "@ui/api"
import { CustomErc20TokenViewDetails } from "@ui/domains/Erc20Tokens/CustomErc20TokenViewDetails"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { useBalancesHydrate } from "@ui/state/balances"
import { useNetworkById } from "@ui/state/chaindata"
import { useRequest } from "@ui/state/requests"
import { Button } from "@ui/talisman-ui/components/Button"
import { type FC, type PropsWithChildren, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { PopupContent, PopupFooter, PopupHeader, PopupLayout } from "../Layout/PopupLayout"

const FakePill: FC<PropsWithChildren> = ({ children }) => {
  return (
    <span className="inline-flex h-[2.6rem] items-center gap-2 rounded-3xl bg-grey-850 px-3 font-light text-body">
      {children}
    </span>
  )
}

export const AddCustomErc20Token = () => {
  const { t } = useTranslation()
  useBalancesHydrate() // preload
  const [error, setError] = useState<string>()
  const { id } = useParams() as WatchAssetRequestIdOnly
  const request = useRequest(id)

  useEffect(() => {
    if (!request) window.close()
  }, [request])

  const network = useNetworkById(request?.token?.networkId, "ethereum")

  const approve = useCallback(async () => {
    setError(undefined)
    try {
      await api.ethWatchAssetRequestApprove(id)
      window.close()
    } catch (err) {
      setError((err as Error).message)
    }
  }, [id])

  const cancel = useCallback(async () => {
    setError(undefined)
    try {
      await api.ethWatchAssetRequestCancel(id)
    } catch {
      // ignore
    }
    window.close()
  }, [id])

  if (!request || !request.token || !network) return null

  return (
    <PopupLayout>
      <PopupHeader>
        <AppPill url={request.url} />
      </PopupHeader>
      <PopupContent>
        <div className="flex h-full w-full flex-col pt-16 text-center">
          <div>
            <img
              className="inline-block h-28 w-28 rounded-full"
              src={request.token.logo ?? UNKNOWN_TOKEN_URL}
              alt={request.token.symbol}
              crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
            />
          </div>
          <h1 className="pt-8 pb-12 font-bold text-md">{t("New Token")}</h1>
          <div className="text-body-secondary">
            <p>{t("You are adding the token")}</p>
            <div className="flex items-center justify-center gap-2">
              <FakePill>
                <img
                  className="h-8 w-8 rounded-full"
                  src={request.token.logo ?? UNKNOWN_TOKEN_URL}
                  crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
                  alt=""
                />
                <span className="leading-none">{request.token.symbol}</span>
              </FakePill>
              <span>{t("on")}</span>
              <FakePill>
                <NetworkLogo networkId={network.id} />
                <span>{network.name}</span>
              </FakePill>
            </div>
          </div>
          <div className="mt-16">
            <CustomErc20TokenViewDetails token={request.token} network={network} />
          </div>
          <div className="flex-grow"></div>
          {!!request.warnings?.length && (
            <SignAlertMessage type="error" className="mt-8">
              {request.warnings.map((warning, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: legacy
                <div key={i}>
                  {request.warnings.length > 1 ? "- " : ""}
                  {warning}
                </div>
              ))}
            </SignAlertMessage>
          )}
        </div>
      </PopupContent>
      <PopupFooter>
        {error && <div className="text-alert-error">{error}</div>}
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
