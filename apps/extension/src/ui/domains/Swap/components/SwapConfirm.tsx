import { LoaderIcon } from "@talismn/icons"
import { useAtomValue } from "jotai"
import { loadable } from "jotai/utils"
import { Trans, useTranslation } from "react-i18next"

import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useChainsMap, useEvmNetworksMap, useSelectedCurrency } from "@ui/state"

import { useFiatValueForAmount } from "../hooks/useFiatValueForAmount"
import { fromAmountAtom, fromAssetAtom, toAssetAtom } from "../swap-modules/common.swap-module"
import { useFastBalance } from "../swaps-port/useFastBalance"
import { selectedQuoteAtom, toAmountAtom } from "../swaps.api"
import { SwapConfirmEvm } from "./SwapConfirmEvm"
import { SwapConfirmSubstrate } from "./SwapConfirmSubstrate"

export const SwapConfirm = ({
  fastBalance,
}: {
  fastBalance: ReturnType<typeof useFastBalance>
}) => {
  const { t } = useTranslation()

  const quote = useAtomValue(loadable(selectedQuoteAtom))

  const chains = useChainsMap()
  const networks = useEvmNetworksMap()

  const fromAsset = useAtomValue(fromAssetAtom)
  const toAsset = useAtomValue(toAssetAtom)
  const fromAmount = useAtomValue(fromAmountAtom)
  const toAmount = useAtomValue(loadable(toAmountAtom))
  const currency = useSelectedCurrency()
  const fromFiatAmount = useFiatValueForAmount({ amount: fromAmount, asset: fromAsset })
  const toFiatAmount = useFiatValueForAmount({
    amount: toAmount.state === "hasData" && toAmount.data ? toAmount.data : undefined,
    asset: toAsset,
  })
  const fromNetwork = fromAsset
    ? (chains[fromAsset.chainId] ?? networks[fromAsset.chainId])
    : undefined
  const toNetwork = toAsset ? (chains[toAsset.chainId] ?? networks[toAsset.chainId]) : undefined

  return (
    <div className="flex h-full w-full flex-col items-center gap-8 overflow-y-auto px-12 pb-44">
      <h3 className="h-32 text-lg font-bold">{t("You are swapping")}</h3>

      <div className="bg-grey-900 relative flex w-full flex-col gap-4 rounded p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col overflow-hidden">
            <div className="text-body-secondary">{t("Sending")}</div>
            <div className="text-body-inactive flex items-center gap-3 text-xs">
              <Trans t={t}>
                from{" "}
                <div className="flex items-center gap-2 overflow-hidden">
                  <ChainLogo id={fromNetwork?.id} />{" "}
                  <span className="truncate">{fromNetwork?.name}</span>
                </div>
              </Trans>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {fromAsset && (
              <img
                src={fromAsset.image}
                alt=""
                className="border-grey-800 h-12 w-12 min-w-12 rounded-full"
              />
            )}
            <div className="flex items-center gap-2">
              <Tokens
                className="whitespace-pre"
                amount={fromAmount.toString()}
                symbol={fromAmount.currency}
                decimals={fromAmount.decimals}
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
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col overflow-hidden">
            <div className="text-body-secondary">{t("Receiving")}</div>
            <div className="text-body-inactive flex items-center gap-3 text-xs">
              <Trans t={t}>
                on{" "}
                <div className="flex items-center gap-2 overflow-hidden">
                  <ChainLogo id={toNetwork?.id} />{" "}
                  <span className="truncate">{toNetwork?.name}</span>
                </div>
              </Trans>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {toAsset && (
              <img
                src={toAsset.image}
                alt=""
                className="border-grey-800 h-12 w-12 min-w-12 rounded-full"
              />
            )}
            {toAmount.state === "hasData" && toAmount.data ? (
              <div className="flex items-center gap-2">
                <div>
                  ~
                  <Tokens
                    className="whitespace-pre"
                    amount={toAmount.data.toString()}
                    symbol={toAmount.data.currency}
                    decimals={toAmount.data.decimals}
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
              <LoaderIcon className="animate-spin-slow text-body-disabled" />
            )}
          </div>
        </div>
        <div className="my-6 border-t border-t-[#3f3f3f]" />
        <div className="flex items-center justify-between">
          <div className="text-body-secondary text-sm">{t("Provider")}</div>
          <div className="flex items-center justify-end gap-4">
            <img
              src={
                (quote.state === "hasData" &&
                  quote.data &&
                  quote.data.quote.state === "hasData" &&
                  quote.data.quote.data &&
                  quote.data.quote.data.providerLogo) ||
                undefined
              }
              alt=""
              className="mb-1 h-10 rounded-full"
            />
            <p className="text-body-secondary max-w-60 truncate text-xs font-semibold">
              {quote.state === "hasData" &&
                quote.data &&
                quote.data.quote.state === "hasData" &&
                quote.data.quote.data &&
                quote.data.quote.data.providerName}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-black px-12 py-8">
        {fromAsset?.networkType === "evm" && <SwapConfirmEvm fastBalance={fastBalance} />}
        {fromAsset?.networkType === "substrate" && (
          <SwapConfirmSubstrate fastBalance={fastBalance} />
        )}
      </div>
    </div>
  )
}
