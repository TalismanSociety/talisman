import { LoaderIcon } from "@talismn/icons"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { loadable } from "jotai/utils"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import {
  fromAddressAtom,
  fromAmountAtom,
  fromAssetAtom,
  SwappableAssetWithDecimals,
  swapQuoteRefresherAtom,
  toAddressAtom,
  toAssetAtom,
} from "../swap-modules/common.swap-module"
import { swapViewAtom } from "../swaps-port/swapViewAtom"
import { type useFastBalance } from "../swaps-port/useFastBalance"
import {
  fromAssetsAtom,
  selectedQuoteAtom,
  swapQuotesAtom,
  toAmountAtom,
  toAssetsAtom,
  useFromAccount,
  useReverse,
  useSwapErc20Approval,
  useToAccount,
} from "../swaps.api"
import { FromToAccountSelector } from "./FromToAccountSelector"
import { ReverseButton } from "./ReverseButton"
import { SwapDetails } from "./SwapDetails"
import { TokenAmountInput } from "./TokenAmountInput"

export const SwapForm = ({ fastBalance }: { fastBalance: ReturnType<typeof useFastBalance> }) => {
  const { t } = useTranslation()
  const setSwapView = useSetAtom(swapViewAtom)

  const setQuoteRefresher = useSetAtom(swapQuoteRefresherAtom)
  const quote = useAtomValue(loadable(selectedQuoteAtom))

  const fromAddress = useAtomValue(fromAddressAtom)
  const [fromAsset, setFromAsset] = useAtom(fromAssetAtom)
  const [fromAmount, setFromAmount] = useAtom(fromAmountAtom)
  useToAccount()
  const { fromEvmAccount, fromSubstrateAccount } = useFromAccount()
  const toAddress = useAtomValue(toAddressAtom)
  const [toAsset, setToAsset] = useAtom(toAssetAtom)

  const toAmount = useAtomValue(loadable(toAmountAtom))
  const fromAssets = useAtomValue(loadable(fromAssetsAtom))
  const toAssets = useAtomValue(loadable(toAssetsAtom))
  const [cachedToAmount, setCachedToAmount] = useState(
    toAmount.state === "hasData" ? toAmount.data : undefined,
  )
  const quotes = useAtomValue(swapQuotesAtom)

  // reset when any of the inputs change
  useEffect(() => {
    setCachedToAmount(undefined)
  }, [fromAmount, fromAsset, toAsset])

  useEffect(() => {
    if (toAmount.state === "hasData" && toAmount.data) setCachedToAmount(toAmount.data)
  }, [toAmount])

  const reverse = useReverse()

  const handleChangeFromAsset = useCallback(
    (asset: SwappableAssetWithDecimals | null) => {
      if (asset && toAsset && asset.id === toAsset.id) reverse()
      else setFromAsset(asset)
    },
    [reverse, setFromAsset, toAsset],
  )

  const handleChangeToAsset = useCallback(
    (asset: SwappableAssetWithDecimals | null) => {
      if (asset && fromAsset && asset.id === fromAsset.id) reverse()
      else setToAsset(asset)
    },
    [fromAsset, reverse, setToAsset],
  )

  const insufficientBalance = useMemo(() => {
    if (!fastBalance?.balance) return undefined
    return fromAmount.planck > fastBalance.balance.transferable.planck
  }, [fastBalance, fromAmount.planck])

  const { data: approvalData, loading: approvalLoading } = useSwapErc20Approval()

  // refresh quote every 20 seconds
  useEffect(() => {
    if (quotes.state === "loading") return
    if (quotes.state === "hasData") {
      if (quotes.data?.some((d) => d.state === "loading")) return
    }
    const id = setInterval(() => setQuoteRefresher(new Date().getTime()), 20_000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // mb-52 is composed of:
    //     mb-44 (the height of the `Review` button and its container)
    //   + pb-8  (an extra gap at the bottom of the `overflow-y-auto` scrollable view)
    <div className="mb-52 flex h-full w-full flex-col gap-8 overflow-y-auto px-12">
      <div className="bg-grey-900 relative flex w-full flex-col gap-4 rounded p-8">
        <h4 className="text-sm">{t("Select asset")}</h4>

        <TokenAmountInput
          hideBalance={fromAsset?.id === "btc-native"}
          assets={fromAssets.state === "hasData" ? fromAssets.data : undefined}
          amount={fromAmount}
          onChangeAmount={setFromAmount}
          leadingLabel={t("You're sending")}
          evmAddress={fromEvmAccount?.address as `0x${string}`}
          substrateAddress={fromSubstrateAccount?.address}
          selectedAsset={fromAsset}
          availableBalance={fastBalance?.balance?.transferable}
          stayAliveBalance={fastBalance?.balance?.stayAlive}
          onChangeAsset={handleChangeFromAsset}
          disableBtc
        />
        <ReverseButton />
        <TokenAmountInput
          amount={cachedToAmount ?? undefined}
          assets={toAssets.state === "hasData" ? toAssets.data : undefined}
          leadingLabel={t("You're receiving")}
          selectedAsset={toAsset}
          onChangeAsset={handleChangeToAsset}
          evmAddress={fromEvmAccount?.address as `0x${string}`}
          substrateAddress={fromSubstrateAccount?.address}
          disabled
          hideBalance
        />
      </div>

      <FromToAccountSelector />

      <SwapDetails />

      <div className="absolute bottom-0 left-0 w-full bg-black px-12 py-8">
        {fromAsset?.networkType === "btc" && (
          <Button className="!w-full !rounded" disabled>
            {t("Swapping from BTC is not supported")}
          </Button>
        )}

        {["evm", "substrate"].includes(fromAsset?.networkType ?? "") && approvalData && (
          <Button className="!w-full !rounded" primary onClick={() => setSwapView("approve-erc20")}>
            {t(`Allow {{protocolName}} to spend {{symbol}}`, {
              protocolName: approvalData.protocolName,
              symbol: fromAsset?.symbol,
            })}
          </Button>
        )}

        {["evm", "substrate"].includes(fromAsset?.networkType ?? "") && !approvalData && (
          <Button
            className="!w-full !rounded"
            primary
            disabled={
              toAmount.state !== "hasData" ||
              !toAmount.data ||
              toAmount.data.planck === 0n ||
              !fromAddress ||
              !toAddress ||
              insufficientBalance !== false ||
              approvalLoading
            }
            onClick={() => {
              if (quote.state !== "hasData" || !quote.data) return
              if (!fastBalance?.balance) return
              if (quote.data.quote.state !== "hasData" || !quote.data.quote.data) return
              setSwapView("confirm")
            }}
          >
            {approvalLoading ? (
              <LoaderIcon className="animate-spin-slow text-body-disabled" />
            ) : (
              t("Review")
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
