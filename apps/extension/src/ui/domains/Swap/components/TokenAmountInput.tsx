import { HelpCircleIcon, LoaderIcon } from "@talismn/icons"
import { classNames, planckToTokens, tokensToPlanck } from "@talismn/util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useSelectedCurrency } from "@ui/state/settings"
import { type FC, type ReactNode, useCallback, useEffect, useId, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { useFiatValueForAmount } from "../hooks/useFiatValueForAmount"
import { useSwap } from "../SwapProvider"
import type { SwappableAssetWithDecimals } from "../swap-modules/common.swap-module"
import { parseUserInputToPlanckOrUndefined } from "../swap-utils"
import { SelectTokenModal } from "./SelectTokenModal"

type Props = {
  amount?: bigint
  assets?: SwappableAssetWithDecimals[]
  selectedAsset?: SwappableAssetWithDecimals | null
  evmAddress?: `0x${string}`
  substrateAddress?: string
  onChangeAmount?: (value: bigint) => void
  onChangeAsset?: (asset: SwappableAssetWithDecimals | null) => void
  leadingLabel?: ReactNode
  availableBalance?: bigint
  stayAliveBalance?: bigint
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

  const [input, setInput] = useState(
    (amount ?? 0n) > 0n
      ? (planckToTokens(amount!.toString(), selectedAsset?.decimals ?? 0) ?? "")
      : ""
  )

  // reset input when fromAddress changes
  const { fromAddress } = useSwap()
  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    onChangeAmount?.(0n)

    // only re-run this effect when `fromAddress` changes
  }, [fromAddress])

  const currency = useSelectedCurrency()

  const shouldDisplayBalance = useMemo(() => {
    if (hideBalance || !selectedAsset) return false
    if (selectedAsset?.networkType === "evm") return !!evmAddress
    return !!substrateAddress
  }, [evmAddress, hideBalance, selectedAsset, substrateAddress])

  const parseInput = useCallback(
    (value: string): bigint => {
      if (!selectedAsset) return 0n
      try {
        const formattedInput = value.endsWith(".") ? `${value}0` : value
        return parseUserInputToPlanckOrUndefined(formattedInput, selectedAsset.decimals) ?? 0n
      } catch {
        return 0n
      }
    },
    [selectedAsset]
  )

  const handleChangeAsset = useCallback(
    (asset: SwappableAssetWithDecimals | null) => {
      setInput("")
      onChangeAsset?.(asset)
      onChangeAmount?.(0n)
    },
    [onChangeAmount, onChangeAsset]
  )

  const handleChangeInput = useCallback(
    (value: string) => {
      setInput(value)
      const parsedPlanck = parseInput(value)
      onChangeAmount?.(parsedPlanck)
    },
    [onChangeAmount, parseInput]
  )

  const fiatValue = useFiatValueForAmount({ planck: amount, asset: selectedAsset, usdOverride })

  const insufficientBalance = useMemo(() => {
    if (availableBalance === undefined || !amount) return false
    return amount > (availableBalance ?? 0n)
  }, [amount, availableBalance])

  const accountWillBeReaped = useMemo(() => {
    if (stayAliveBalance === undefined || !amount || amount === 0n) return false
    return stayAliveBalance < amount
  }, [amount, stayAliveBalance])

  const maxAfterGas = useMemo(() => {
    if (!selectedAsset || availableBalance === undefined) return null
    const idParts = selectedAsset.id.split("-")
    const assetType = idParts[idParts.length - 1]

    if (assetType === "native") {
      const decimals = selectedAsset.decimals

      const swapGasBufferWei = maxNativeTokenGasBuffer ? BigInt(maxNativeTokenGasBuffer) : 0n
      const hardcodedGasBufferWei = BigInt(
        tokensToPlanck(
          String(hardcodedGasBufferByTokenSymbol[selectedAsset.symbol.toLowerCase()] ?? 0),
          decimals
        )
      )

      const totalBufferWei = availableBalance - hardcodedGasBufferWei - swapGasBufferWei
      return totalBufferWei
    }

    return availableBalance
  }, [availableBalance, maxNativeTokenGasBuffer, selectedAsset])

  const onSetMaxAmount = useCallback(() => {
    if (maxAfterGas === null || maxAfterGas <= 0) return
    const maxStr = planckToTokens(maxAfterGas.toString(), selectedAsset?.decimals ?? 0) ?? "0"
    handleChangeInput(maxStr)
  }, [handleChangeInput, maxAfterGas, selectedAsset?.decimals])

  useEffect(() => {
    if (amount == null) return setInput("")
    const parsedPlanck = parseInput(input)
    if (parsedPlanck !== amount) {
      if (amount > 0n) {
        setInput(planckToTokens(amount.toString(), selectedAsset?.decimals ?? 0) ?? "0")
      } else {
        if (parsedPlanck !== 0n) {
          setInput("")
        }
      }
    }
  }, [amount, input, parseInput, selectedAsset?.decimals])

  const trailingLabel = useMemo(() => {
    if (!shouldDisplayBalance) return null
    if (maxAfterGas === null) return <LoaderIcon className="animate-spin-slow" />

    const maxAfterGasAmount =
      maxAfterGas <= 0
        ? "0"
        : (planckToTokens(maxAfterGas.toString(), selectedAsset?.decimals ?? 0) ?? "0")
    const symbol = selectedAsset?.symbol

    if (availableBalance === undefined || availableBalance <= 0)
      return <div>{t("Selected account has no {{symbol}}", { symbol })}</div>
    if (maxAfterGasAmount === "0")
      return <div>{t("Insufficient {{symbol}} balance for gas", { symbol })}</div>
    return (
      <div>
        {t("Available:")}{" "}
        <Tokens amount={maxAfterGasAmount} decimals={selectedAsset?.decimals} symbol={symbol} />
      </div>
    )
  }, [availableBalance, maxAfterGas, selectedAsset, shouldDisplayBalance, t])

  const inputId = useId()

  return (
    <div>
      {leadingLabel || trailingLabel ? (
        <div className="mb-2 flex items-center justify-between text-body-secondary text-xs">
          {leadingLabel && <label htmlFor={inputId}>{leadingLabel}</label>}
          {trailingLabel && <label htmlFor={inputId}>{trailingLabel}</label>}
        </div>
      ) : null}
      <div
        className={classNames(
          "flex items-center gap-5 rounded border border-red-400/0 bg-black-tertiary py-4 pr-4 pl-6",
          (insufficientBalance || (disableBtc && selectedAsset?.id === "btc-native")) &&
            "border-red-400"
        )}
      >
        <div className="flex w-full flex-1 flex-col overflow-hidden">
          <input
            type="text"
            id={inputId}
            autoComplete="off"
            disabled={disabled}
            className="text-ellipsis bg-transparent font-semibold text-grey-50 text-md placeholder-grey-400"
            value={input}
            placeholder="0.00"
            onChange={(e) => handleChangeInput(e.target.value)}
          />
          <div className="flex items-center">
            <p className="truncate text-[10px] text-grey-400 leading-none">
              {(fiatValue ?? 0)?.toLocaleString(undefined, { currency, style: "currency" })}
            </p>
            {insufficientBalance ? (
              <p className="ml-[8px] shrink-0 border-l border-l-grey-600 pl-[8px] text-[10px] text-red-400 leading-none">
                {t("Insufficient balance")}
              </p>
            ) : accountWillBeReaped ? (
              <div className="flex shrink-0 items-center gap-1 text-orange-400">
                <p className="ml-[8px] shrink-0 border-l border-l-grey-600 pl-[8px] text-[10px] leading-none">
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
              <p className="ml-[8px] shrink-0 border-l border-l-grey-600 pl-[8px] text-[10px] text-red-400 leading-none">
                {t("Swapping from BTC not supported.")}
              </p>
            ) : null}
          </div>
        </div>

        {shouldDisplayBalance ? (
          <button
            type="button"
            className={classNames(
              "rounded-xs border border-current px-3 py-1 text-[1rem] text-body-secondary",
              !maxAfterGas && "animate-pulse text-body-disabled",
              maxAfterGas !== null && maxAfterGas <= 0 && "text-body-disabled",
              maxAfterGas !== null && maxAfterGas > 0 && "hover:text-white"
            )}
            onClick={onSetMaxAmount}
            disabled={maxAfterGas === null || maxAfterGas <= 0}
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
