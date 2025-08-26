import { useAtomValue } from "jotai"
import { loadable } from "jotai/utils"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { Tokens } from "@ui/domains/Asset/Tokens"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { AddressDisplay } from "@ui/domains/SendFunds/AddressDisplay"
import { useNetworksMapById, useSelectedCurrency } from "@ui/state"

import { useFiatValueForAmount } from "../hooks/useFiatValueForAmount"
import {
  fromAddressAtom,
  fromAmountAtom,
  fromAssetAtom,
  toAddressAtom,
  toAssetAtom,
} from "../swap-modules/common.swap-module"
import { useFastBalance } from "../swaps-port/useFastBalance"
import { toAmountAtom } from "../swaps.api"
import { SwapConfirmEvm } from "./SwapConfirmEvm"
import { SwapConfirmSubstrate } from "./SwapConfirmSubstrate"

export const SwapConfirm = ({
  fastBalance,
}: {
  fastBalance: ReturnType<typeof useFastBalance>
}) => {
  const { t } = useTranslation()

  const networks = useNetworksMapById()

  const fromAsset = useAtomValue(fromAssetAtom)
  const toAsset = useAtomValue(toAssetAtom)
  const fromAmount = useAtomValue(fromAmountAtom)
  const toAmount = useAtomValue(loadable(toAmountAtom))
  const fromAddress = useAtomValue(fromAddressAtom)
  const toAddress = useAtomValue(toAddressAtom)
  const currency = useSelectedCurrency()
  const fromFiatAmount = useFiatValueForAmount({ amount: fromAmount, asset: fromAsset })
  const toFiatAmount = useFiatValueForAmount({
    amount: toAmount.state === "hasData" && toAmount.data ? toAmount.data : undefined,
    asset: toAsset,
  })
  const fromNetwork = fromAsset ? networks[fromAsset.chainId] : undefined
  const toNetwork = toAsset ? networks[toAsset.chainId] : undefined

  return (
    <div className="mb-44 flex h-full w-full flex-col items-center gap-8 overflow-y-auto px-12">
      <h3 className="-mb-8 h-32 text-lg font-bold">{t("You are swapping")}</h3>

      <div className="bg-grey-900 relative flex w-full flex-col gap-4 rounded px-12 py-8">
        <div className="flex items-center justify-between gap-4">
          <div className="text-body-secondary">{t("Sending")}</div>
          <div className="flex items-center gap-4">
            {fromAsset && (
              <div className="relative">
                <img
                  src={fromAsset.image}
                  alt=""
                  className="border-grey-800 h-12 w-12 min-w-12 rounded-full"
                />
                <NetworkLogo
                  className="border-grey-800 absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 rounded-full border text-xs"
                  networkId={fromNetwork?.id}
                />
              </div>
            )}

            <div className="flex flex-col items-end">
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
              <div className="text-body-inactive flex items-center gap-3 text-xs">
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
            {toAsset && (
              <div className="relative">
                <img
                  src={toAsset.image}
                  alt=""
                  className="border-grey-800 h-12 w-12 min-w-12 rounded-full"
                />
                <NetworkLogo
                  className="border-grey-800 absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 rounded-full border text-xs"
                  networkId={toNetwork?.id}
                />{" "}
              </div>
            )}

            <div className="flex flex-col items-end">
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
                <div className="flex items-center gap-2">
                  <div className="text-body-disabled bg-body-disabled rounded-xs inline-block animate-pulse">
                    ~0.002 TKN ($1.00)
                  </div>
                </div>
              )}
              <div className="text-body-inactive flex items-center gap-3 text-xs">
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
              networkId={fromAsset?.chainId ? String(fromAsset?.chainId) : undefined}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col overflow-hidden">
            <div className="text-body-secondary text-sm">{t("To")}</div>
          </div>
          <div className="flex items-center gap-3">
            <AddressDisplay
              className="h-16"
              address={toAddress}
              networkId={toAsset?.chainId ? String(toAsset?.chainId) : undefined}
            />
          </div>
        </div>
      </div>

      {fromAsset?.networkType === "evm" && <SwapConfirmEvm fastBalance={fastBalance} />}
      {fromAsset?.networkType === "substrate" && <SwapConfirmSubstrate fastBalance={fastBalance} />}
    </div>
  )
}
