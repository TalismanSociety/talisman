import { useSyncSwapsChaindata } from "@talismn/balances-react"
import { AlertCircleIcon, ExternalLinkIcon, LoaderIcon } from "@talismn/icons"
import { TALISMAN_WEB_APP_SWAP_URL } from "extension-shared"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { loadable } from "jotai/utils"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { useAccountsMap, useNetworkById } from "@ui/state"

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
  useSetToAddress,
  useSwapErc20Approval,
} from "../swaps.api"
import { FromToAccountSelector } from "./FromToAccountSelector"
import { ReverseButton } from "./ReverseButton"
import { SwapDetails } from "./SwapDetails"
import { TokenAmountInput } from "./TokenAmountInput"

export const SwapForm = ({
  fastBalance,
  approveRecipient,
}: {
  fastBalance: ReturnType<typeof useFastBalance>
  approveRecipient?: boolean
}) => {
  const { t } = useTranslation()
  const setSwapView = useSetAtom(swapViewAtom)

  const setQuoteRefresher = useSetAtom(swapQuoteRefresherAtom)
  const quote = useAtomValue(loadable(selectedQuoteAtom))

  const fromAddress = useAtomValue(fromAddressAtom)
  const [fromAsset, setFromAsset] = useAtom(fromAssetAtom)
  const [fromAmount, setFromAmount] = useAtom(fromAmountAtom)
  const { fromEvmAccount, fromSubstrateAccount } = useFromAccount()
  const toAddress = useAtomValue(toAddressAtom)
  useSetToAddress()
  const [toAsset, setToAsset] = useAtom(toAssetAtom)

  const toAmount = useAtomValue(loadable(toAmountAtom))
  const fromAssets = useAtomValue(loadable(fromAssetsAtom))
  const toAssets = useAtomValue(loadable(toAssetsAtom))
  const [cachedToAmount, setCachedToAmount] = useState(
    toAmount.state === "hasData" ? toAmount.data : undefined,
  )
  const toNetwork = useNetworkById(String(toAsset?.chainId ?? ""))
  const quotes = useAtomValue(swapQuotesAtom)

  const accountsMap = useAccountsMap()
  const toAccount = toAddress ? accountsMap[toAddress] : null
  const toIsWatched = toAccount?.type === "watch-only"
  const toIsExternal = !toAccount || toAccount.type === "contact"

  useSyncSwapsChaindata()

  useEffect(() => {
    if (approveRecipient && !(toIsWatched || toIsExternal)) setSwapView("form")
  }, [approveRecipient, setSwapView, toIsExternal, toIsWatched])

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
        <div className="flex items-start justify-between">
          <h4 className="text-sm">{t("Select asset")}</h4>
          <a
            className="text-grey-500 hover:text-grey-400 inline-flex items-center gap-2 text-xs"
            href={TALISMAN_WEB_APP_SWAP_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span>{t("More routes")}</span>
            <ExternalLinkIcon />
          </a>
        </div>

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
          maxNativeTokenGasBuffer={
            (quote?.state === "hasData" &&
              quote?.data?.quote?.state === "hasData" &&
              quote?.data?.quote?.data?.maxNativeTokenGasBuffer) ||
            undefined
          }
          priorityMode="sell"
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
          priorityMode="buy"
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
              quotes.state !== "hasData" ||
              quotes.data?.some((d) => d.state === "loading") ||
              approvalLoading
            }
            onClick={() => {
              if (quote.state !== "hasData" || !quote.data) return
              if (!fastBalance?.balance) return
              if (quote.data.quote.state !== "hasData" || !quote.data.quote.data) return

              // if toAddress isn't an owned account, show a warning to the user
              if (toIsExternal || toIsWatched) return setSwapView("approve-recipient")

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

        {approveRecipient && (
          <div className="bg-black-tertiary animate-slide-in-up absolute bottom-0 left-0 m-8 flex flex-col gap-8 rounded p-8">
            <div className="flex items-center gap-3 text-sm text-orange-400">
              {toIsWatched && (
                <Trans t={t}>
                  <AlertCircleIcon /> Sending {toAsset?.symbol} to a watch-only account on{" "}
                  {toNetwork?.name}.
                </Trans>
              )}
              {toIsExternal && (
                <Trans t={t}>
                  <AlertCircleIcon /> Sending {toAsset?.symbol} to an external account on{" "}
                  {toNetwork?.name}.
                </Trans>
              )}
            </div>
            <div className="flex gap-8">
              <Button className="!w-full !rounded" small onClick={() => setSwapView("form")}>
                {t("Cancel")}
              </Button>
              <Button
                className="!w-full !rounded"
                small
                primary
                onClick={() => setSwapView("confirm")}
              >
                {t("Proceed")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
