import { useSyncSwapsChaindata } from "@talismn/balances-react"
import { AlertCircleIcon, LoaderIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { useAccountsMap } from "@ui/state/accounts"
import { useNetworkById } from "@ui/state/chaindata"
import { useCallback, useEffect, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { useSwap } from "../SwapProvider"
import type { SwappableAssetWithDecimals } from "../swap-modules/common.swap-module"
import type { useFastBalance } from "../swaps-port/useFastBalance"
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

  const {
    setSwapView,
    selectedQuote,
    fromAddress,
    fromAsset,
    setFromAsset,
    fromAmount,
    setFromAmount,
    fromEvmAccount,
    fromSubstrateAccount,
    toAddress,
    toAsset,
    setToAsset,
    toAmount,
    fromAssets,
    toAssets,
    isLoadingQuotes,
    isAllQuotesSettled,
    reverse,
    erc20Approval: { data: approvalData, loading: approvalLoading },
  } = useSwap()

  const toNetwork = useNetworkById(String(toAsset?.chainId ?? ""))

  const accountsMap = useAccountsMap()
  const toAccount = toAddress ? accountsMap[toAddress] : null
  const toIsWatched = toAccount?.type === "watch-only"
  const toIsExternal = !toAccount || toAccount.type === "contact"

  useSyncSwapsChaindata()

  useEffect(() => {
    if (approveRecipient && !(toIsWatched || toIsExternal)) setSwapView("form")
  }, [approveRecipient, setSwapView, toIsExternal, toIsWatched])

  const handleChangeFromAsset = useCallback(
    (asset: SwappableAssetWithDecimals | null) => {
      if (asset && toAsset && asset.id === toAsset.id) reverse()
      else setFromAsset(asset)
    },
    [reverse, setFromAsset, toAsset]
  )

  const handleChangeToAsset = useCallback(
    (asset: SwappableAssetWithDecimals | null) => {
      if (asset && fromAsset && asset.id === fromAsset.id) reverse()
      else setToAsset(asset)
    },
    [fromAsset, reverse, setToAsset]
  )

  const insufficientBalance = useMemo(() => {
    if (!fastBalance?.balance) return undefined
    return fromAmount > fastBalance.balance.transferable
  }, [fastBalance, fromAmount])

  return (
    // mb-52 is composed of:
    //     mb-44 (the height of the `Review` button and its container)
    //   + pb-8  (an extra gap at the bottom of the `overflow-y-auto` scrollable view)
    <div className="mb-52 flex h-full w-full flex-col gap-8 overflow-y-auto px-12">
      <div className="relative flex w-full flex-col gap-4 rounded bg-grey-900 p-8">
        <div className="flex items-start justify-between">
          <h4 className="text-sm">{t("Select asset")}</h4>
        </div>

        <TokenAmountInput
          hideBalance={fromAsset?.id === "btc-native"}
          assets={fromAssets}
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
          maxNativeTokenGasBuffer={selectedQuote?.maxNativeTokenGasBuffer || undefined}
          priorityMode="sell"
        />
        <ReverseButton />
        <TokenAmountInput
          amount={toAmount ?? undefined}
          assets={toAssets}
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
              !toAmount ||
              toAmount === 0n ||
              !fromAddress ||
              !toAddress ||
              insufficientBalance !== false ||
              isLoadingQuotes ||
              !isAllQuotesSettled ||
              approvalLoading
            }
            onClick={() => {
              if (!selectedQuote) return
              if (!fastBalance?.balance) return

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
          <div className="absolute bottom-0 left-0 m-8 flex animate-slide-in-up flex-col gap-8 rounded bg-black-tertiary p-8">
            <div className="flex items-center gap-3 text-orange-400 text-sm">
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
