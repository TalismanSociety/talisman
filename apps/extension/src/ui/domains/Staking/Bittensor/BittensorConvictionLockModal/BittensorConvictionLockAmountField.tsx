import { BalanceFormatter } from "@talismn/balances"
import { tokensToPlanck } from "@talismn/util"
import { PillButton } from "@ui/components/PillButton"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useInputAutoWidth } from "@ui/hooks/useInputAutoWidth"
import { useTokenRates } from "@ui/state/tokenRates"
import { cn } from "@ui/util/cn"
import {
  type ChangeEventHandler,
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

type BittensorConvictionLockAmountFieldProps = {
  tokenId: string | null | undefined
  decimals: number
  symbol: string
  plancks: bigint | null
  maxPlancks: bigint
  onChange: (plancks: bigint | null) => void
  errorMessage?: string | null
}

/**
 * Alpha amount input for the conviction lock wizard, mirroring the dtao staking amount field
 * (centered input, token logo + symbol, Max button, reserved error line). Amount is denominated
 * in the subnet's alpha token; Max is the subnet-wide available-to-lock amount.
 */
export const BittensorConvictionLockAmountField: FC<BittensorConvictionLockAmountFieldProps> = ({
  tokenId,
  decimals,
  symbol,
  plancks,
  maxPlancks,
  onChange,
  errorMessage,
}) => {
  const { t } = useTranslation()

  const tokenRates = useTokenRates(tokenId)

  const formattedValue = useMemo(
    () => (typeof plancks === "bigint" ? new BalanceFormatter(plancks, decimals).tokens : ""),
    [plancks, decimals]
  )

  // fiat value of the current amount, shown next to the Max button (display only, no fiat input)
  const fiatAmount = useMemo(
    () =>
      typeof plancks === "bigint" ? new BalanceFormatter(plancks, decimals, tokenRates) : null,
    [plancks, decimals, tokenRates]
  )

  const [value, setValue] = useState(formattedValue)
  const refSkipSync = useRef(false)

  useEffect(() => {
    if (refSkipSync.current) {
      refSkipSync.current = false
      return
    }
    setValue(formattedValue ?? "")
  }, [formattedValue])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      refSkipSync.current = true
      const nextValue = e.target.value
      setValue(nextValue)

      if (!nextValue.trim()) return onChange(null)

      try {
        onChange(BigInt(tokensToPlanck(nextValue, decimals)))
      } catch {
        // invalid input, ignore
        onChange(null)
      }
    },
    [decimals, onChange]
  )

  const refInput = useRef<HTMLInputElement>(null)

  const refInitialized = useRef(false)
  useEffect(() => {
    if (refInitialized.current) return
    refInitialized.current = true
    if (typeof plancks !== "bigint") refInput.current?.focus()
  }, [plancks])

  // resize input to keep content centered
  useInputAutoWidth(refInput)

  const onSetMaxClick = useCallback(() => {
    if (maxPlancks > 0n) onChange(maxPlancks)
  }, [maxPlancks, onChange])

  return (
    <div className="flex w-full grow flex-col justify-center gap-4">
      <div className="h-16" />
      <div className="flex flex-col font-bold text-xl">
        <div className="flex w-full max-w-100 flex-nowrap items-center justify-center gap-4">
          <input
            ref={refInput}
            type="text"
            inputMode="decimal"
            placeholder="0"
            step="any"
            value={value}
            className="peer inline-block w-fit min-w-0 text-ellipsis bg-transparent text-body text-xl"
            onChange={handleChange}
          />
          <div className="flex shrink-0 items-center gap-2 font-normal text-base text-body">
            <TokenLogo className="text-lg" tokenId={tokenId ?? undefined} />
            <div>{symbol}</div>
          </div>
        </div>
      </div>
      <div className="flex max-w-full items-center justify-center gap-4">
        {tokenRates && fiatAmount && (
          <div className="max-w-[264px] truncate text-body-secondary text-sm">
            <Fiat amount={fiatAmount} noCountUp />
          </div>
        )}
        <PillButton
          onClick={onSetMaxClick}
          disabled={maxPlancks <= 0n}
          size="xs"
          className={cn("h-11 rounded-sm px-4! py-0!")}
        >
          {t("Max")}
        </PillButton>
      </div>
      <div className="h-16">
        <div className="line-clamp-2 text-center text-brand-orange text-xs">{errorMessage}</div>
      </div>
    </div>
  )
}
