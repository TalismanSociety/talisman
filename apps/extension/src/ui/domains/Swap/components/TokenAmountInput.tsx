import { HelpCircleIcon, LoaderIcon } from "@talismn/icons"
import { classNames, tokensToPlanck } from "@talismn/util"
import { useAtomValue } from "jotai"
import { FC, ReactNode, useCallback, useEffect, useId, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { Tokens } from "@ui/domains/Asset/Tokens"
import { useSelectedCurrency } from "@ui/state"

import { useFiatValueForAmount } from "../hooks/useFiatValueForAmount"
import { fromAddressAtom, SwappableAssetWithDecimals } from "../swap-modules/common.swap-module"
import { Decimal } from "../swaps-port/Decimal"
import { SelectTokenModal } from "./SelectTokenModal"

type Props = {
  amount?: Decimal
  assets?: SwappableAssetWithDecimals[]
  selectedAsset?: SwappableAssetWithDecimals | null
  evmAddress?: `0x${string}`
  substrateAddress?: string
  onChangeAmount?: (value: Decimal) => void
  onChangeAsset?: (asset: SwappableAssetWithDecimals | null) => void
  leadingLabel?: ReactNode
  availableBalance?: Decimal
  stayAliveBalance?: Decimal
  disabled?: boolean
  hideBalance?: boolean
  disableBtc?: boolean
  usdOverride?: number
  maxNativeTokenGasBuffer?: string
  /** Used to determine which tokens should be prioritized to the top of the list */
  priorityMode?: "buy" | "sell"
}

const hardcodedGasBufferByTokenSymbol: Record<string, number> = {
  dot: 0.03,
  eth: 0.0005,
  s: 0.01,
}

export const TokenAmountInput: FC<Props> = ({
  amount,
  assets,
  availableBalance,
  disableBtc,
  hideBalance,
  leadingLabel,
  onChangeAsset,
  selectedAsset,
  evmAddress,
  substrateAddress,
  onChangeAmount,
  stayAliveBalance,
  disabled = false,
  usdOverride,
  maxNativeTokenGasBuffer,
  priorityMode,
}) => {
  const { t } = useTranslation()

  const [input, setInput] = useState((amount?.planck ?? 0n) > 0n ? (amount?.toString() ?? "") : "")

  // reset input when fromAddress changes
  const fromAddress = useAtomValue(fromAddressAtom)
  useEffect(() => {
    onChangeAmount?.(Decimal.fromPlanck(0n, 1))

    // only re-run this effect when `fromAddress` changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromAddress])

  const currency = useSelectedCurrency()

  const shouldDisplayBalance = useMemo(() => {
    if (hideBalance || !selectedAsset) return false
    if (selectedAsset?.networkType === "evm") return !!evmAddress
    return !!substrateAddress
  }, [evmAddress, hideBalance, selectedAsset, substrateAddress])

  const parseInput = useCallback(
    (value: string) => {
      if (!selectedAsset) return Decimal.fromPlanck(0, 1)
      try {
        const formattedInput = value.endsWith(".") ? `${value}0` : value
        return Decimal.fromUserInput(formattedInput, selectedAsset.decimals, {
          currency: selectedAsset.symbol,
        })
      } catch (e) {
        return Decimal.fromPlanck(0, 1)
      }
    },
    [selectedAsset],
  )

  const handleChangeAsset = useCallback(
    (asset: SwappableAssetWithDecimals | null) => {
      setInput("")
      onChangeAsset?.(asset)
      onChangeAmount?.(Decimal.fromPlanck(0, asset?.decimals ?? 1))
    },
    [onChangeAmount, onChangeAsset],
  )

  const handleChangeInput = useCallback(
    (value: string) => {
      setInput(value)
      const parsedDecimal = parseInput(value)
      onChangeAmount?.(parsedDecimal)
    },
    [onChangeAmount, parseInput],
  )

  const fiatValue = useFiatValueForAmount({ amount, asset: selectedAsset, usdOverride })

  const insufficientBalance = useMemo(() => {
    if (availableBalance === undefined || !amount) return false
    return amount.planck > (availableBalance?.planck ?? 0n)
  }, [amount, availableBalance])

  const accountWillBeReaped = useMemo(() => {
    if (!stayAliveBalance || !amount || amount.planck === 0n) return false
    return stayAliveBalance.planck < amount.planck
  }, [amount, stayAliveBalance])

  const maxAfterGas = useMemo(() => {
    if (!selectedAsset || !availableBalance) return null
    const idParts = selectedAsset.id.split("-")
    const assetType = idParts[idParts.length - 1]

    if (assetType === "native") {
      const { decimals, currency } = availableBalance

      const swapGasBufferWei = maxNativeTokenGasBuffer ? BigInt(maxNativeTokenGasBuffer) : 0n
      const hardcodedGasBufferWei = BigInt(
        tokensToPlanck(
          String(hardcodedGasBufferByTokenSymbol[selectedAsset.symbol.toLowerCase()] ?? 0),
          decimals,
        ),
      )

      const totalBufferWei = availableBalance.planck - hardcodedGasBufferWei - swapGasBufferWei
      return Decimal.fromPlanck(totalBufferWei, decimals, { currency })
    }

    return availableBalance
  }, [availableBalance, maxNativeTokenGasBuffer, selectedAsset])
  const onSetMaxAmount = useCallback(() => {
    if (!maxAfterGas || maxAfterGas.planck <= 0) return
    const { planck, decimals, currency } = maxAfterGas
    handleChangeInput(Decimal.fromPlanck(planck, decimals, { currency }).toString())
  }, [handleChangeInput, maxAfterGas])

  useEffect(() => {
    if (!amount) return setInput("")
    const parsedDecimal = parseInput(input)
    if (parsedDecimal.planck !== amount.planck) {
      if (amount.planck > 0n) {
        setInput(amount.toString())
      } else {
        if (parsedDecimal.planck !== 0n) {
          setInput("")
        }
      }
    }
  }, [amount, input, parseInput])

  const trailingLabel = useMemo(() => {
    if (!shouldDisplayBalance) return null
    if (!maxAfterGas) return <LoaderIcon className="animate-spin-slow" />

    const maxAfterGasAmount = maxAfterGas.planck <= 0 ? "0" : maxAfterGas.toString()
    const decimals = maxAfterGas.decimals ?? selectedAsset?.decimals
    const symbol = maxAfterGas.currency ?? selectedAsset?.symbol

    if (!availableBalance || availableBalance.planck <= 0)
      return <div>{t("Selected account has no {{symbol}}", { symbol })}</div>
    if (maxAfterGasAmount === "0")
      return <div>{t("Insufficient {{symbol}} balance for gas", { symbol })}</div>
    return (
      <div>
        {t("Available:")} <Tokens amount={maxAfterGasAmount} decimals={decimals} symbol={symbol} />
      </div>
    )
  }, [availableBalance, maxAfterGas, selectedAsset, shouldDisplayBalance, t])

  const inputId = useId()

  return (
    <div>
      {leadingLabel || trailingLabel ? (
        <div className="text-body-secondary mb-2 flex items-center justify-between text-xs">
          {leadingLabel && <label htmlFor={inputId}>{leadingLabel}</label>}
          {trailingLabel && <label htmlFor={inputId}>{trailingLabel}</label>}
        </div>
      ) : null}
      <div
        className={classNames(
          "bg-black-tertiary flex items-center gap-5 rounded border border-red-400/0 py-4 pl-6 pr-4",
          (insufficientBalance || (disableBtc && selectedAsset?.id === "btc-native")) &&
            "border-red-400",
        )}
      >
        <div className="flex w-full flex-1 flex-col overflow-hidden">
          <input
            type="text"
            id={inputId}
            autoComplete="off"
            disabled={disabled}
            className="text-md text-grey-50 placeholder-grey-400 text-ellipsis bg-transparent font-semibold"
            value={input}
            placeholder="0.00"
            onChange={(e) => handleChangeInput(e.target.value)}
          />
          <div className="flex items-center">
            <p className="text-grey-400 truncate text-[10px] leading-none">
              {(fiatValue ?? 0)?.toLocaleString(undefined, { currency, style: "currency" })}
            </p>
            {insufficientBalance ? (
              <p className="border-l-grey-600 ml-[8px] shrink-0 border-l pl-[8px] text-[10px] leading-none text-red-400">
                {t("Insufficient balance")}
              </p>
            ) : accountWillBeReaped ? (
              <div className="flex shrink-0 items-center gap-1 text-orange-400">
                <p className="border-l-grey-600 ml-[8px] shrink-0 border-l pl-[8px] text-[10px] leading-none">
                  {t("Account will be reaped")}
                </p>

                <Tooltip placement="bottom">
                  <TooltipTrigger>
                    <Link
                      to="https://support.polkadot.network/support/solutions/articles/65000168651-what-is-the-existential-deposit-"
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <HelpCircleIcon className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-[12px]">
                      <Trans t={t}>
                        This amount will cause your balance to go below the Existential Deposit,
                        <br />
                        which will reap your account.
                        <br />
                        Any remaining funds in your account will be forfeited.
                      </Trans>
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : disableBtc && selectedAsset?.id === "btc-native" ? (
              <p className="border-l-grey-600 ml-[8px] shrink-0 border-l pl-[8px] text-[10px] leading-none text-red-400">
                {t("Swapping from BTC not supported.")}
              </p>
            ) : null}
          </div>
        </div>

        {shouldDisplayBalance ? (
          <button
            className={classNames(
              "text-body-secondary rounded-xs border border-current px-3 py-1 text-[1rem]",
              !maxAfterGas && "text-body-disabled animate-pulse",
              maxAfterGas && maxAfterGas.planck <= 0 && "text-body-disabled",
              maxAfterGas && maxAfterGas.planck > 0 && "hover:text-white",
            )}
            onClick={onSetMaxAmount}
            disabled={!maxAfterGas || maxAfterGas.planck <= 0}
          >
            {t("Max")}
          </button>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <SelectTokenModal
            onSelectAsset={handleChangeAsset}
            selectedAsset={selectedAsset}
            assets={assets}
            priorityMode={priorityMode}
          />
        </div>
      </div>
    </div>
  )
}
