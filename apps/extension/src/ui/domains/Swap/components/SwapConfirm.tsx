import { planckToTokens } from "@talismn/util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { AddressDisplay } from "@ui/domains/SendFunds/AddressDisplay"
import { useNetworksMapById, useToken } from "@ui/state/chaindata"
import { useSelectedCurrency } from "@ui/state/settings"
import { useTranslation } from "react-i18next"
import { useFiatValueForAmount } from "../hooks/useFiatValueForAmount"
import { useSwap } from "../SwapProvider"
import { SwapConfirmEvm } from "./SwapConfirmEvm"
import { SwapConfirmSubstrate } from "./SwapConfirmSubstrate"

export const SwapConfirm = () => {
  const { t } = useTranslation()

  const networks = useNetworksMapById()

  const { fromTokenId, toTokenId, fromAmount, toAmount, fromAddress, toAddress } = useSwap()
  const fromToken = useToken(fromTokenId ?? undefined)
  const toToken = useToken(toTokenId ?? undefined)

  const currency = useSelectedCurrency()
  const fromFiatAmount = useFiatValueForAmount({ planck: fromAmount, tokenId: fromTokenId })
  const toFiatAmount = useFiatValueForAmount({
    planck: toAmount ?? undefined,
    tokenId: toTokenId,
  })
  const fromNetwork = fromToken ? networks[fromToken.networkId] : undefined
  const toNetwork = toToken ? networks[toToken.networkId] : undefined

  const fromNetworkType =
    fromToken?.platform === "ethereum"
      ? "evm"
      : fromToken?.platform === "polkadot"
        ? "substrate"
        : null

  return (
    <div className="mb-44 flex h-full w-full flex-col items-center gap-8 overflow-y-auto px-12">
      <h3 className="-mb-8 h-32 font-bold text-lg">{t("You are swapping")}</h3>

      <div className="relative flex w-full flex-col gap-4 rounded bg-grey-900 px-12 py-8">
        <div className="flex items-center justify-between gap-4">
          <div className="text-body-secondary">{t("Sending")}</div>
          <div className="flex items-center gap-4">
            {fromToken && (
              <div className="relative">
                <TokenLogo
                  tokenId={fromToken.id}
                  className="h-12 w-12 min-w-12 rounded-full border-grey-800"
                />
                <NetworkLogo
                  className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 rounded-full border border-grey-800 text-xs"
                  networkId={fromNetwork?.id}
                />
              </div>
            )}

            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <Tokens
                  className="whitespace-pre"
                  amount={planckToTokens(fromAmount.toString(), fromToken?.decimals ?? 0)}
                  symbol={fromToken?.symbol}
                  noCountUp
                />
                <div className="text-body-secondary">
                  (
                  {(fromFiatAmount ?? 0).toLocaleString(undefined, {
                    currency,
                    style: "currency",
                    currencyDisplay: "narrowSymbol",
                  })}
                  )
                </div>
              </div>
              <div className="flex items-center gap-3 text-body-inactive text-xs">
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="truncate">{fromNetwork?.name}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-2">
                      <NetworkLogo networkId={fromNetwork?.id} />{" "}
                      <span className="truncate">{fromNetwork?.name}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-body-secondary">{t("Receiving")}</div>
          <div className="flex items-center gap-4">
            {toToken && (
              <div className="relative">
                <TokenLogo
                  tokenId={toToken.id}
                  className="h-12 w-12 min-w-12 rounded-full border-grey-800"
                />
                <NetworkLogo
                  className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 rounded-full border border-grey-800 text-xs"
                  networkId={toNetwork?.id}
                />{" "}
              </div>
            )}

            <div className="flex flex-col items-end">
              {toAmount ? (
                <div className="flex items-center gap-2">
                  <div>
                    ~
                    <Tokens
                      className="whitespace-pre"
                      amount={planckToTokens(toAmount.toString(), toToken?.decimals ?? 0)}
                      symbol={toToken?.symbol}
                      noCountUp
                    />
                  </div>
                  <div className="text-body-secondary">
                    (
                    {(toFiatAmount ?? 0).toLocaleString(undefined, {
                      currency,
                      style: "currency",
                      currencyDisplay: "narrowSymbol",
                    })}
                    )
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="inline-block animate-pulse rounded-xs bg-body-disabled text-body-disabled">
                    ~0.002 TKN ($1.00)
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 text-body-inactive text-xs">
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="truncate">{toNetwork?.name}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-2">
                      <NetworkLogo networkId={toNetwork?.id} /> {toNetwork?.name}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        <div className="my-6 border-t border-t-[#3f3f3f]" />

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col overflow-hidden">
            <div className="text-body-secondary text-sm">{t("From")}</div>
          </div>
          <div className="flex items-center gap-3">
            <AddressDisplay
              className="h-16"
              address={fromAddress}
              networkId={fromToken?.networkId}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col overflow-hidden">
            <div className="text-body-secondary text-sm">{t("To")}</div>
          </div>
          <div className="flex items-center gap-3">
            <AddressDisplay className="h-16" address={toAddress} networkId={toToken?.networkId} />
          </div>
        </div>
      </div>

      {fromNetworkType === "evm" && <SwapConfirmEvm />}
      {fromNetworkType === "substrate" && <SwapConfirmSubstrate />}
    </div>
  )
}
