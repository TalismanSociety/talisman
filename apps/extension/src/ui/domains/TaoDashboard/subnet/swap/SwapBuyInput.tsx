import { BalanceFormatter } from "@talismn/balances"
import type { Token, TokenId } from "@talismn/chaindata-provider"
import { cn, tokensToPlanck } from "@talismn/util"
import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useIsBalanceInitializing } from "@ui/state"
import { type ChangeEventHandler, type FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { SelectSenderAccountPill } from "./SelectSenderAccountPill"
import { useSwapBuy } from "./SwapBuyProvider"

export const SwapBuyInput: FC = () => {
  const {
    address,
    tokenIn,
    valueIn,
    maxValueIn,
    onAccountChange,
    onValueChange,
    inputErrorMessage,
  } = useSwapBuy()

  const handleMaxClick = useCallback(() => {
    onValueChange(maxValueIn)
  }, [maxValueIn, onValueChange])

  if (!tokenIn) return null

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 overflow-hidden rounded bg-black p-6",
        "border border-transparent",
        inputErrorMessage && "!border-alert-error/50"
      )}
    >
      <div className="flex w-full items-center justify-between gap-6">
        <SelectSenderAccountPill
          address={address}
          tokenId={tokenIn.id}
          onSelect={onAccountChange}
        />
        {address && (
          <div className="flex items-center gap-2">
            <BalanceDisplay />
            <MaxButton tokenId={tokenIn.id} maxAmount={maxValueIn} onClick={handleMaxClick} />
          </div>
        )}
      </div>
      <div className="max-w-full overflow-hidden">
        <div className="flex h-20 w-full gap-6 overflow-hidden">
          <TokenInput token={tokenIn} value={valueIn} onValueChanged={onValueChange} />
          <TokenDisplay tokenId={tokenIn.id} />
        </div>
        <div
          className={cn(
            "invisible w-full truncate text-alert-error text-sm",
            inputErrorMessage && "visible"
          )}
        >
          {/* fallback invisible label to prevent layout shift */}
          {inputErrorMessage || "Error placeholder"}
        </div>
      </div>
    </div>
  )
}

const TokenDisplay: FC<{ tokenId: TokenId }> = ({ tokenId }) => {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-4">
      <TokenLogo className="text-xl" tokenId={tokenId} />
      <div>
        <TokenDisplaySymbol tokenId={tokenId} />
        <div className="text-body-secondary text-xs">{t("Native")}</div>
      </div>
    </div>
  )
}

const BalanceDisplay: FC = () => {
  const { t } = useTranslation()
  const { balanceTokenIn } = useSwapBuy()

  const isInitializing = useIsBalanceInitializing()
  const isLoading = useMemo(
    () => isInitializing || balanceTokenIn?.status !== "live",
    [balanceTokenIn, isInitializing]
  )

  return (
    <div className={cn("text-body-secondary text-sm", isLoading && "animate-pulse")}>
      {t("Bal:")}{" "}
      <TokensAndFiat
        planck={balanceTokenIn?.transferable.planck ?? 0n}
        tokenId={balanceTokenIn?.tokenId}
        noCountUp
        noFiat
      />
    </div>
  )
}

const MaxButton: FC<{
  tokenId: TokenId
  maxAmount?: bigint
  onClick: () => void
}> = ({ maxAmount, onClick }) => {
  const { t } = useTranslation()
  if (maxAmount === undefined) return null

  return (
    <button
      type="button"
      disabled={!maxAmount}
      className="rounded-full bg-grey-800 px-3 py-1.5 text-body-secondary text-sm enabled:hover:bg-grey-700 disabled:text-body-disabled"
      onClick={onClick}
    >
      {t("Max")}
    </button>
  )
}

const TokenInput: FC<{
  token: Token
  value: bigint | null
  onValueChanged: (value: bigint | null) => void
}> = ({ token, value, onValueChanged }) => {
  const { t } = useTranslation()
  const formatter = useMemo(
    () => (value !== null ? new BalanceFormatter(value, token.decimals) : null),
    [token.decimals, value]
  )

  const formattedValue = useMemo(() => formatter?.tokens ?? "", [formatter?.tokens])

  const [inputValue, setInputValue] = useState(formattedValue)

  useEffect(() => {
    setInputValue(formattedValue)
  }, [formattedValue])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      // refSkipSync.current = true
      const nextValue = e.target.value
      setInputValue(nextValue)

      if (!token || !nextValue.trim()) return onValueChanged(null)

      try {
        const plancks = tokensToPlanck(nextValue, token.decimals)
        onValueChanged(BigInt(plancks))
      } catch {
        // invalid input, ignore
        onValueChanged(null)
      }
    },
    [onValueChanged, token]
  )

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={t("Enter Amount")}
      step="any"
      value={inputValue}
      className={
        "peer inline-block grow text-ellipsis bg-transparent text-[2rem] text-body placeholder:text-body-disabled"
      }
      onChange={handleChange}
    />
  )
}
