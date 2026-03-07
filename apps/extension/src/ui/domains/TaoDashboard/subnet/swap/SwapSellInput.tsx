import { BalanceFormatter } from "@talismn/balances"
import { SettingsIcon } from "@talismn/icons"
import { cn, tokensToPlanck } from "@talismn/util"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AccountDisplay } from "@ui/domains/Earn/shared/AccountDisplay"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { useIsBalanceInitializing } from "@ui/state"
import { PillButton, useOpenClose } from "@ui/talisman-ui"
import { type ChangeEventHandler, type FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { SwapSellPositionPickerModal } from "./SwapSellPositionPickerModal"
import { useSwapSell } from "./SwapSellProvider"

export const SwapSellInput: FC = () => {
  const {
    positions,
    selectedPosition,
    onPositionChange,
    tokenIn,
    valueIn,
    maxValueIn,
    onValueChange,
    inputErrorMessage,
  } = useSwapSell()

  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  const isPickerDisabled = positions.length === 0

  const handleSelectPosition = useCallback(
    (positionId: string) => {
      onPositionChange(positionId)
    },
    [onPositionChange]
  )

  const handleMaxClick = useCallback(() => {
    onValueChange(maxValueIn)
  }, [maxValueIn, onValueChange])

  return (
    <div className="flex w-full flex-col gap-5 overflow-hidden">
      <div
        className={cn(
          "flex w-full flex-col gap-6 overflow-hidden rounded bg-black p-6",
          "border border-transparent",
          inputErrorMessage && "!border-alert-error/50"
        )}
      >
        <div className="flex w-full items-center justify-between gap-6 overflow-hidden">
          <AccountPickerButton
            position={selectedPosition}
            disabled={isPickerDisabled}
            onClick={open}
          />
          <div className="flex items-center gap-2">
            <BalanceDisplay />
            <MaxButton maxAmount={maxValueIn} onClick={handleMaxClick} />
          </div>
        </div>
        <div className="w-full overflow-hidden">
          <div className="flex h-20 w-full gap-6 overflow-hidden">
            <div className="grow">
              <TokenInput
                tokenDecimals={tokenIn?.decimals}
                value={valueIn}
                onValueChanged={onValueChange}
                disabled={!tokenIn}
              />
            </div>
            <div className="max-w-[40%]">
              <TokenPickerButton
                position={selectedPosition}
                disabled={isPickerDisabled}
                onClick={open}
              />
            </div>
          </div>
          <div
            className={cn(
              "invisible w-full truncate text-alert-error text-sm",
              inputErrorMessage && "visible"
            )}
          >
            {inputErrorMessage || t("Error")}
          </div>
        </div>

        <SwapSellPositionPickerModal
          isOpen={isOpen}
          onClose={close}
          positions={positions}
          selectedId={selectedPosition?.id}
          onSelect={(position) => handleSelectPosition(position.id)}
        />
      </div>
      <div className="flex h-14 w-full shrink-0 items-center justify-end">
        <PositionValidatorPill position={selectedPosition} onClick={open} />
      </div>
    </div>
  )
}

const PositionValidatorPill: FC<{
  position: ReturnType<typeof useSwapSell>["selectedPosition"]
  onClick: () => void
}> = ({ position, onClick }) => {
  const { t } = useTranslation()
  if (!position) return null

  return (
    <PillButton
      className={cn(
        "flex h-14 items-center gap-2 overflow-hidden rounded bg-grey-800 px-4 font-medium text-body-secondary text-sm hover:bg-grey-700"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {position.token.hotkey ? (
          <BittensorValidatorName hotkey={position.token.hotkey} />
        ) : (
          t("Select Validator")
        )}
        <SettingsIcon />
      </div>
    </PillButton>
  )
}

const AccountPickerButton: FC<{
  position: ReturnType<typeof useSwapSell>["selectedPosition"]
  disabled?: boolean
  onClick: () => void
}> = ({ position, disabled, onClick }) => {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "flex h-14 items-center gap-2 overflow-hidden rounded bg-grey-800 px-4 font-medium text-sm text-white enabled:hover:bg-grey-700 disabled:text-body-disabled",
        position && "pl-2"
      )}
      onClick={onClick}
    >
      {position ? <AccountDisplay address={position.balance.address} /> : t("Select Position")}
    </button>
  )
}

const TokenPickerButton: FC<{
  position: ReturnType<typeof useSwapSell>["selectedPosition"]
  disabled?: boolean
  onClick: () => void
}> = ({ position, disabled, onClick }) => {
  const { t } = useTranslation()

  return (
    <PillButton
      onClick={onClick}
      disabled={disabled}
      className="h-20 w-full overflow-hidden rounded-xs bg-transparent px-2"
    >
      {position ? (
        <div className="flex w-full items-center gap-4 overflow-hidden">
          <TokenLogo className="text-xl" tokenId={position.token.id} />
          <div className="flex flex-col items-start gap-1 overflow-hidden">
            <div className="text-base text-body">SN{position.token.netuid}</div>
            <div className="max-w-full truncate text-body-secondary text-xs">
              {position.token.subnetName ??
                t("Subnet {{netuid}}", { netuid: position.token.netuid })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-body-secondary text-sm">{t("Select Position")}</div>
      )}
    </PillButton>
  )
}

const BalanceDisplay: FC = () => {
  const { t } = useTranslation()
  const { balanceTokenIn, tokenIdIn } = useSwapSell()

  const isInitializing = useIsBalanceInitializing()
  const isLoading = useMemo(
    () => isInitializing || balanceTokenIn?.status !== "live",
    [balanceTokenIn, isInitializing]
  )

  if (!tokenIdIn) return null

  return (
    <div className={cn("text-body-secondary text-sm", isLoading && "animate-pulse")}>
      {t("Bal:")}{" "}
      <TokensAndFiat
        planck={balanceTokenIn?.transferable.planck ?? 0n}
        tokenId={tokenIdIn}
        noCountUp
        noFiat
      />
    </div>
  )
}

const MaxButton: FC<{
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
  tokenDecimals?: number
  value: bigint | null
  onValueChanged: (value: bigint | null) => void
  disabled?: boolean
}> = ({ tokenDecimals, value, onValueChanged, disabled }) => {
  const { t } = useTranslation()

  const formatter = useMemo(() => {
    if (value === null || typeof tokenDecimals !== "number") return null
    return new BalanceFormatter(value, tokenDecimals)
  }, [tokenDecimals, value])

  const formattedValue = useMemo(() => formatter?.tokens ?? "", [formatter?.tokens])

  const [inputValue, setInputValue] = useState(formattedValue)

  useEffect(() => {
    setInputValue(formattedValue)
  }, [formattedValue])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const nextValue = e.target.value
      setInputValue(nextValue)

      if (!nextValue.trim() || typeof tokenDecimals !== "number") return onValueChanged(null)

      try {
        const plancks = tokensToPlanck(nextValue, tokenDecimals)
        onValueChanged(BigInt(plancks))
      } catch {
        onValueChanged(null)
      }
    },
    [onValueChanged, tokenDecimals]
  )

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={t("Enter Amount")}
      step="any"
      value={inputValue}
      disabled={disabled}
      className={
        "peer inline-block h-20 w-full text-ellipsis bg-transparent text-[2rem] text-body placeholder:text-body-disabled"
      }
      onChange={handleChange}
    />
  )
}
