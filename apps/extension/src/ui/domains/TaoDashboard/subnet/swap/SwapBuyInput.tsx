import { BalanceFormatter } from "@talismn/balances"
import type { Token, TokenId } from "@talismn/chaindata-provider"
import { cn, tokensToPlanck } from "@talismn/util"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useBalance, useIsBalanceInitializing, useToken } from "@ui/state"
import { type ChangeEventHandler, type FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { SelectSenderAccountPill } from "./SelectSenderAccountPill"

export const SwapBuyInput: FC<{
  address: string | null
  tokenId: TokenId
  value: bigint | null
  maxValue?: bigint
  onAccountChange: (address: string) => void
  onTokenChange: (tokenId: TokenId) => void
  onValueChange: (value: bigint | null) => void
}> = ({ address, tokenId, value, maxValue, onValueChange, onAccountChange }) => {
  const token = useToken(tokenId)

  const handleMaxClick = useCallback(() => {
    if (maxValue !== undefined) {
      onValueChange(maxValue)
    }
  }, [maxValue, onValueChange])

  if (!token) return null

  return (
    <div className="flex w-full flex-col gap-6 overflow-hidden rounded bg-black p-6">
      <div className="flex w-full justify-between gap-6">
        <SelectSenderAccountPill address={address} tokenId={tokenId} onSelect={onAccountChange} />
        {address && (
          <div className="flex items-center gap-2">
            <BalanceDisplay tokenId={tokenId} address={address} />
            <MaxButton tokenId={tokenId} maxAmount={maxValue} onClick={handleMaxClick} />
          </div>
        )}
      </div>
      <div className="flex w-full flex-col gap-6 overflow-hidden rounded bg-black p-6">
        <TokenInput token={token} value={value} onValueChanged={onValueChange} />
      </div>
    </div>
  )
}

const BalanceDisplay: FC<{ tokenId: TokenId; address: string }> = ({ tokenId, address }) => {
  const { t } = useTranslation()
  const balance = useBalance(address, tokenId)

  const isInitializing = useIsBalanceInitializing()
  const isLoading = useMemo(
    () => isInitializing || balance?.status !== "live",
    [balance, isInitializing]
  )

  return (
    <div className={cn("text-body-secondary text-sm", isLoading && "animate-pulse")}>
      {t("Bal:")}{" "}
      <TokensAndFiat
        planck={balance?.transferable.planck ?? 0n}
        tokenId={tokenId}
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
      className="rounded-full bg-grey-800 px-3 py-1.5 text-body-secondary text-sm hover:bg-grey-700"
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

  // return (
  //   <div className={"flex w-full max-w-[400px] flex-nowrap items-center justify-center gap-4"}>

  //     <button
  //       type="button"
  //       onClick={onTokenClick}
  //       className={cn(
  //         "flex shrink-0 items-center gap-2 font-normal text-base text-body",
  //         onTokenClick ? "cursor-pointer" : "cursor-default"
  //       )}
  //     >
  //       <TokenLogo className="text-lg" tokenId={token.id} />
  //       <div>
  //         <TokenDisplaySymbol tokenId={token.id} />
  //       </div>
  //     </button>
  //   </div>
  // )
}
