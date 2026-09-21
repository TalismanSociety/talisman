import { IS_FIREFOX, UNKNOWN_TOKEN_URL } from "@common/constants"
import type { WatchAssetRequestIdOnly, WatchAssetWarning } from "@core/domains/ethereum/types"
import { api } from "@ui/api"
import { AppPill } from "@ui/components/AppPill"
import { Button } from "@ui/components/Button"
import { CustomErc20TokenViewDetails } from "@ui/domains/Erc20Tokens/CustomErc20TokenViewDetails"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { GoPlusReportCard } from "@ui/domains/TokenRisk/GoPlusReportCard"
import { TokenRiskCard } from "@ui/domains/TokenRisk/TokenRiskCard"
import { useTokenRiskScan } from "@ui/domains/TokenRisk/useTokenRiskScan"
import { useBalancesHydrate } from "@ui/state/balances"
import { useNetworkById } from "@ui/state/chaindata"
import { useRequest } from "@ui/state/requests"
import { type FC, type PropsWithChildren, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { PopupContent, PopupFooter, PopupHeader, PopupLayout } from "../Layout/PopupLayout"

const FakePill: FC<PropsWithChildren> = ({ children }) => {
  return (
    <span className="inline-flex h-6.5 items-center gap-2 rounded-3xl bg-grey-850 px-3 font-light text-body">
      {children}
    </span>
  )
}

const useWatchAssetWarningMessage = () => {
  const { t } = useTranslation()
  return (warning: WatchAssetWarning) => {
    switch (warning.type) {
      case "unverified-contract":
        return t("Failed to verify the contract information")
      case "symbol-mismatch":
        return t(
          "Suggested symbol {{symbol}} is different from the one defined on the contract ({{contractSymbol}})",
          { symbol: warning.symbol, contractSymbol: warning.contractSymbol }
        )
      case "missing-coingecko-id":
        return t("This token's address is not registered on CoinGecko")
      case "duplicate-symbol":
        return t("Another {{symbol}} token already exists on this network", {
          symbol: warning.symbol,
        })
    }
  }
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
  const getWarningMessage = useWatchAssetWarningMessage()
  const { scan, isPending: isScanPending } = useTokenRiskScan(request?.token, "dapp-add-token")
  const [isRiskAcknowledged, setIsRiskAcknowledged] = useState(false)
  const isRiskBlocking = scan?.verdict === "Malicious" && !isRiskAcknowledged

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

  if (!request?.token || !network) return null

  return (
    <PopupLayout>
      <PopupHeader>
        <AppPill url={request.url} />
      </PopupHeader>
      <PopupContent>
        <div className="flex min-h-full w-full flex-col pt-16 text-center">
          <div>
            <img
              className="inline-block h-28 w-28 rounded-full"
              src={request.token.logo ?? UNKNOWN_TOKEN_URL}
              alt={request.token.symbol}
              crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
            />
          </div>
          <h1 className="pt-8 pb-8 font-bold text-md">{t("New Token")}</h1>
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
          <div className="mt-10">
            <CustomErc20TokenViewDetails token={request.token} network={network} />
          </div>
          <GoPlusReportCard token={request.token} className="mt-8" />
          <TokenRiskCard
            scan={scan}
            symbol={request.token.symbol}
            isAcknowledged={isRiskAcknowledged}
            onAcknowledgedChange={setIsRiskAcknowledged}
            className="mt-4"
          />
          <div className="grow"></div>
          {!!request.warnings?.length && (
            <SignAlertMessage type="error" className="mt-8">
              {request.warnings.map((warning, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: legacy
                <div key={i}>
                  {request.warnings.length > 1 ? "- " : ""}
                  {getWarningMessage(warning)}
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
          <Button primary processing={isScanPending} disabled={isRiskBlocking} onClick={approve}>
            {t("Approve")}
          </Button>
        </div>
      </PopupFooter>
    </PopupLayout>
  )
}
