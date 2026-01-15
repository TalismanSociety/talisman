import {
  type SubDTaoToken,
  subDTaoTokenId,
  subNativeTokenId,
  type Token,
} from "@talismn/chaindata-provider"
import { ChevronDownIcon } from "@talismn/icons"
import { cn, planckToTokens, tokensToPlanck } from "@talismn/util"
import { useAccounts, useBalances, useSelectedCurrency, useToken, useTokenRates } from "@ui/state"
import {
  type ChangeEventHandler,
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { Button, PillButton } from "talisman-ui"

import { currencyConfig } from "../../../Asset/currencyConfig"
import { TokenLogo } from "../../../Asset/TokenLogo"
import { useBittensorBondModal } from "../../../Staking/Bittensor/hooks/useBittensorBondModal"
import { useBittensorSimulateSwap } from "../../../Staking/Bittensor/hooks/useBittensorSimulateSwap"
import type { BondOption } from "../../../Staking/hooks/bittensor/types"
import { useCombinedBittensorValidatorsData } from "../../../Staking/hooks/bittensor/useCombinedBittensorValidatorsData"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"

interface TaoDashboardSwapProps {
  netuid?: number
}

type SwapDirection = "buy" | "sell"

const formatNumber = (num: number, _decimals = 4) => {
  if (num === 0) return "0"
  if (num < 0.0001) return num.toFixed(6)
  if (num < 1) return num.toFixed(4)
  return num.toFixed(2)
}

const SwapInput: FC<{
  token: Token | null | undefined
  value: string
  onChange: (value: string) => void
  label: string
  balance?: bigint
  disabled?: boolean
  showMax?: boolean
  onMaxClick?: () => void
}> = ({ token, value, onChange, label, balance, disabled, showMax, onMaxClick }) => {
  const tokenRates = useTokenRates(token?.id)
  const currency = useSelectedCurrency()

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  const fiatValue = useMemo(() => {
    if (!value || !tokenRates?.[currency]?.price) return null
    const numValue = parseFloat(value)
    if (Number.isNaN(numValue)) return null
    return numValue * tokenRates[currency].price
  }, [value, tokenRates, currency])

  const balanceDisplay = useMemo(() => {
    if (balance === undefined || !token) return null
    return planckToTokens(balance.toString(), token.decimals)
  }, [balance, token])

  return (
    <div className="rounded-lg bg-grey-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-body-secondary text-xs">{label}</span>
        {balanceDisplay !== null && (
          <span className="flex items-center gap-2 text-body-secondary text-xs">
            Balance: {formatNumber(parseFloat(balanceDisplay))}
            {showMax && onMaxClick && (
              <button
                type="button"
                onClick={onMaxClick}
                className="text-primary hover:text-primary-500"
              >
                MAX
              </button>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "w-full min-w-0 bg-transparent font-bold text-base outline-none",
            disabled && "text-body-secondary"
          )}
        />
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-grey-800 px-4 py-2">
          <TokenLogo tokenId={token?.id} className="size-12" />
          <span className="font-medium text-sm">{token?.symbol ?? "—"}</span>
        </div>
      </div>
      {fiatValue !== null && (
        <div className="mt-2 text-body-secondary text-xs">
          {currencyConfig[currency]?.symbol}
          {formatNumber(fiatValue, 2)}
        </div>
      )}
    </div>
  )
}

const SwapOutput: FC<{
  token: Token | null | undefined
  value: string
  label: string
  isLoading?: boolean
}> = ({ token, value, label, isLoading }) => {
  const tokenRates = useTokenRates(token?.id)
  const currency = useSelectedCurrency()

  const fiatValue = useMemo(() => {
    if (!value || !tokenRates?.[currency]?.price) return null
    const numValue = parseFloat(value)
    if (Number.isNaN(numValue)) return null
    return numValue * tokenRates[currency].price
  }, [value, tokenRates, currency])

  return (
    <div className="rounded-lg bg-grey-900 p-4">
      <div className="mb-3 text-body-secondary text-xs">{label}</div>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-full min-w-0 font-bold text-base",
            isLoading && "animate-pulse text-body-secondary"
          )}
        >
          {isLoading ? "..." : value || "0.00"}
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-grey-800 px-4 py-2">
          <TokenLogo tokenId={token?.id} className="size-12" />
          <span className="font-medium text-sm">{token?.symbol ?? "—"}</span>
        </div>
      </div>
      {fiatValue !== null && !isLoading && (
        <div className="mt-2 text-body-secondary text-xs">
          {currencyConfig[currency]?.symbol}
          {formatNumber(fiatValue, 2)}
        </div>
      )}
    </div>
  )
}

const ValidatorPicker: FC<{
  validators: BondOption[]
  selectedValidator: BondOption | null
  onSelect: (validator: BondOption) => void
  isLoading?: boolean
}> = ({ validators, selectedValidator, onSelect, isLoading }) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number
    left: number
    width: number
    maxHeight: number
  } | null>(null)

  // Find Rizzo (Insured) validator
  const rizzoValidator = useMemo(() => {
    return validators.find((v) => v.hotkey === "5FtBncJvGhxjBs4aFn2pid6aur9tBUuo9QR7sHe5DkoRizzo")
  }, [validators])

  // Sort validators by yield (descending), with Rizzo locked at the top
  const sortedValidators = useMemo(() => {
    const filtered = validators.filter((v) => v.validatorYield) // Only show validators active on this subnet

    // Separate Rizzo from others
    const rizzo = rizzoValidator && filtered.includes(rizzoValidator) ? [rizzoValidator] : []
    const others = filtered.filter((v) => v !== rizzoValidator)

    // Sort others by yield (descending)
    const sortedOthers = others.sort((a, b) => {
      const yieldA = Number(a.validatorYield?.thirty_day_apy ?? 0)
      const yieldB = Number(b.validatorYield?.thirty_day_apy ?? 0)
      return yieldB - yieldA
    })

    // Combine: Rizzo first, then others sorted by yield
    return [...rizzo, ...sortedOthers].slice(0, 20)
  }, [validators, rizzoValidator])

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownHeight = 240 // max-h-[240px]
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top

      // Open upward if not enough space below but enough above
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow

      setDropdownPosition({
        top: openUpward
          ? rect.top + window.scrollY - Math.min(dropdownHeight, spaceAbove - 8) - 4
          : rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
        maxHeight: openUpward
          ? Math.min(dropdownHeight, spaceAbove - 8)
          : Math.min(dropdownHeight, spaceBelow - 8),
      })
    } else {
      setDropdownPosition(null)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = useCallback(
    (validator: BondOption) => {
      onSelect(validator)
      setIsOpen(false)
    },
    [onSelect]
  )

  if (isLoading) {
    return (
      <div className="rounded-lg bg-grey-900 p-3">
        <div className="mb-2 text-body-secondary text-xs">{t("Validator")}</div>
        <div className="h-9 animate-pulse rounded-lg bg-grey-800" />
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-grey-900 p-3">
      <div className="mb-2 text-body-secondary text-xs">{t("Validator")}</div>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between gap-2 rounded-lg bg-grey-800 px-3 py-2 transition-colors hover:bg-grey-750"
        >
          {selectedValidator ? (
            <span className="truncate font-medium text-sm">
              {selectedValidator.name || `${selectedValidator.hotkey.slice(0, 8)}...`}
            </span>
          ) : (
            <span className="text-body-secondary text-sm">{t("Select a validator")}</span>
          )}
          <ChevronDownIcon
            className={cn("size-8 shrink-0 transition-transform", isOpen && "rotate-180")}
          />
        </button>

        {isOpen &&
          dropdownPosition &&
          createPortal(
            <div
              ref={dropdownRef}
              role="listbox"
              className="fixed z-50 overflow-y-auto rounded-lg border border-grey-750 bg-grey-850 shadow-lg"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                maxHeight: `${dropdownPosition.maxHeight}px`,
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {sortedValidators.length === 0 ? (
                <div className="p-4 text-center text-body-secondary text-sm">
                  {t("No validators available")}
                </div>
              ) : (
                sortedValidators.map((validator) => (
                  <button
                    key={validator.hotkey}
                    type="button"
                    onClick={() => handleSelect(validator)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-grey-800",
                      selectedValidator?.hotkey === validator.hotkey && "bg-grey-800"
                    )}
                  >
                    <span className="min-w-0 truncate text-sm">
                      {validator.name ||
                        `${validator.hotkey.slice(0, 8)}...${validator.hotkey.slice(-4)}`}
                    </span>
                    <span className="shrink-0 text-body-secondary text-xs">
                      {validator.validatorYield?.thirty_day_apy
                        ? `${(Number(validator.validatorYield.thirty_day_apy) * 100).toFixed(2)}%`
                        : "—"}
                    </span>
                  </button>
                ))
              )}
            </div>,
            document.body
          )}
      </div>
    </div>
  )
}

export const TaoDashboardSwap: FC<TaoDashboardSwapProps> = ({ netuid: propsNetuid }) => {
  const { t } = useTranslation()
  const { open: openBondModal } = useBittensorBondModal()

  // Get netuid from URL if not provided
  const netuid = propsNetuid

  const [direction, setDirection] = useState<SwapDirection>("buy")
  const [inputValue, setInputValue] = useState("")
  const [selectedValidator, setSelectedValidator] = useState<BondOption | null>(null)

  // Fetch validators for this subnet
  const { combinedValidatorsData, isLoading: isLoadingValidators } =
    useCombinedBittensorValidatorsData(netuid)

  // Find Rizzo (Insured) validator
  const rizzoValidator = useMemo(() => {
    return combinedValidatorsData.find(
      (v) => v.name?.toLowerCase().includes("rizzo") && v.name.toLowerCase().includes("insured")
    )
  }, [combinedValidatorsData])

  // Auto-select Rizzo (Insured) validator first, otherwise first validator with yield data
  useEffect(() => {
    if (!selectedValidator && combinedValidatorsData.length > 0) {
      // Prefer Rizzo (Insured) validator
      if (rizzoValidator?.validatorYield) {
        setSelectedValidator(rizzoValidator)
        return
      }
      // Otherwise, select first validator with yield data
      const activeValidator = combinedValidatorsData
        .filter((v) => v.validatorYield)
        .sort((a, b) => {
          const yieldA = Number(a.validatorYield?.thirty_day_apy ?? 0)
          const yieldB = Number(b.validatorYield?.thirty_day_apy ?? 0)
          return yieldB - yieldA
        })[0]
      if (activeValidator) {
        setSelectedValidator(activeValidator)
      }
    }
  }, [combinedValidatorsData, selectedValidator, rizzoValidator])

  // Get tokens
  const nativeToken = useToken(subNativeTokenId(BITTENSOR_NETWORK_ID), "substrate-native")
  const dtaoToken = useToken(
    netuid ? subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid) : null,
    "substrate-dtao"
  ) as SubDTaoToken | null

  // Get accounts and balances
  const accounts = useAccounts("owned")
  const ownedBalances = useBalances("owned")

  // Get first account with TAO balance as default
  const selectedAccount = useMemo(() => {
    if (!nativeToken || accounts.length === 0) return null

    // Find account with TAO balance
    for (const account of accounts) {
      const balance = ownedBalances.find({
        tokenId: nativeToken.id,
        address: account.address,
      })
      if (balance.sum.planck.transferable > 0n) {
        return account
      }
    }
    // Return first account if none have balance
    return accounts[0] ?? null
  }, [accounts, nativeToken, ownedBalances])

  // Get balances for selected account
  const taoBalance = useMemo(() => {
    if (!selectedAccount || !nativeToken) return 0n
    const balance = ownedBalances.find({
      tokenId: nativeToken.id,
      address: selectedAccount.address,
    })
    return balance.sum.planck.transferable
  }, [selectedAccount, nativeToken, ownedBalances])

  const alphaBalance = useMemo(() => {
    if (!selectedAccount || !dtaoToken) return 0n
    const balance = ownedBalances.find({
      tokenId: dtaoToken.id,
      address: selectedAccount.address,
    })
    return balance.sum.planck.free
  }, [selectedAccount, dtaoToken, ownedBalances])

  // Calculate input amount in plancks
  const inputPlancks = useMemo(() => {
    if (!inputValue || !nativeToken) return null
    try {
      const plancks = tokensToPlanck(inputValue, nativeToken.decimals)
      return BigInt(plancks)
    } catch {
      return null
    }
  }, [inputValue, nativeToken])

  // Simulate swap
  const { data: simulation, isLoading: isSimulating } = useBittensorSimulateSwap({
    networkId: BITTENSOR_NETWORK_ID,
    direction: direction === "buy" ? "taoToAlpha" : "alphaToTao",
    netuid,
    amountIn: inputPlancks,
  })

  // Calculate output value
  const outputValue = useMemo(() => {
    if (!simulation || !nativeToken) return ""
    const outputPlancks = direction === "buy" ? simulation.alpha_amount : simulation.tao_amount
    return planckToTokens(outputPlancks.toString(), nativeToken.decimals)
  }, [simulation, nativeToken, direction])

  // Calculate price impact
  const priceImpact = useMemo(() => {
    if (!simulation) return null
    const fee =
      direction === "buy"
        ? Number(simulation.alpha_fee) / Number(simulation.alpha_amount + simulation.alpha_fee)
        : Number(simulation.tao_fee) / Number(simulation.tao_amount + simulation.tao_fee)
    return fee * 100
  }, [simulation, direction])

  // Handle direction toggle
  const _toggleDirection = useCallback(() => {
    setDirection((prev) => (prev === "buy" ? "sell" : "buy"))
    setInputValue("")
  }, [])

  // Handle max click
  const handleMaxClick = useCallback(() => {
    if (!nativeToken) return
    const balance = direction === "buy" ? taoBalance : alphaBalance
    // Leave some for fees
    const maxAmount = direction === "buy" && balance > 100000000n ? balance - 100000000n : balance
    setInputValue(planckToTokens(maxAmount.toString(), nativeToken.decimals))
  }, [direction, taoBalance, alphaBalance, nativeToken])

  // Validation
  const validationError = useMemo(() => {
    if (!inputPlancks || inputPlancks <= 0n) return null
    const balance = direction === "buy" ? taoBalance : alphaBalance
    if (inputPlancks > balance) return t("Insufficient balance")
    return null
  }, [inputPlancks, direction, taoBalance, alphaBalance, t])

  // Handle swap click
  const handleSwapClick = useCallback(() => {
    if (!selectedAccount || !netuid || !inputPlancks) return
    // For buying, require a validator to be selected
    if (direction === "buy" && !selectedValidator) return

    openBondModal({
      stakeDirection: direction === "buy" ? "bond" : "unbond",
      networkId: BITTENSOR_NETWORK_ID,
      netuid,
      address: selectedAccount.address,
      hotkey: selectedValidator?.hotkey,
    })
  }, [selectedAccount, netuid, inputPlancks, direction, openBondModal, selectedValidator])

  const inputToken = direction === "buy" ? nativeToken : dtaoToken
  const outputToken = direction === "buy" ? dtaoToken : nativeToken
  const inputBalance = direction === "buy" ? taoBalance : alphaBalance

  // For buying, also require a validator to be selected
  const isSwapDisabled =
    !inputPlancks ||
    inputPlancks <= 0n ||
    !!validationError ||
    !selectedAccount ||
    !netuid ||
    (direction === "buy" && !selectedValidator)

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between">
        <h3 className="font-bold text-base">{direction === "buy" ? t("Buy") : t("Sell")}</h3>
        <div className="flex gap-2">
          <PillButton
            onClick={() => setDirection("buy")}
            className={cn(
              "!px-6 !py-2 text-xs",
              direction === "buy" ? "!bg-primary !text-white" : "!bg-grey-800"
            )}
          >
            {t("Buy")}
          </PillButton>
          <PillButton
            onClick={() => setDirection("sell")}
            className={cn(
              "!px-6 !py-2 text-xs",
              direction === "sell" ? "!bg-primary !text-white" : "!bg-grey-800"
            )}
          >
            {t("Sell")}
          </PillButton>
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0">
        <SwapInput
          token={inputToken}
          value={inputValue}
          onChange={setInputValue}
          label={direction === "buy" ? t("You pay") : t("You sell")}
          balance={inputBalance}
          showMax
          onMaxClick={handleMaxClick}
        />
      </div>

      {/* Swap direction button */}
      {/* <div className="flex shrink-0 justify-center">
        <button
          type="button"
          onClick={toggleDirection}
          className="rounded-full bg-grey-800 p-3 transition-colors hover:bg-grey-700"
        >
          <SwapIcon className="size-12 rotate-90" />
        </button>
      </div> */}

      {/* Output */}
      <div className="shrink-0">
        <SwapOutput
          token={outputToken}
          value={outputValue}
          label={direction === "buy" ? t("You receive") : t("You receive")}
          isLoading={isSimulating && inputPlancks !== null && inputPlancks > 0n}
        />
      </div>

      {/* Validator selection - only for buying */}
      {direction === "buy" && (
        <div className="shrink-0">
          <ValidatorPicker
            validators={combinedValidatorsData}
            selectedValidator={selectedValidator}
            onSelect={setSelectedValidator}
            isLoading={isLoadingValidators}
          />
        </div>
      )}

      {/* Price info */}
      {simulation && inputPlancks !== null && inputPlancks > 0n && (
        <div className="flex shrink-0 flex-col gap-2 rounded-lg bg-grey-900 p-4 text-xs">
          <div className="flex justify-between">
            <span className="text-body-secondary">{t("Price Impact")}</span>
            <span
              className={cn(
                priceImpact && priceImpact > 5
                  ? "text-red-500"
                  : priceImpact && priceImpact > 2
                    ? "text-orange-500"
                    : "text-body"
              )}
            >
              {priceImpact ? `${priceImpact.toFixed(2)}%` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-body-secondary">{t("Network Fee")}</span>
            <span>
              {direction === "buy"
                ? `${planckToTokens(simulation.tao_fee.toString(), nativeToken?.decimals ?? 9)} τ`
                : `${planckToTokens(simulation.alpha_fee.toString(), nativeToken?.decimals ?? 9)} α`}
            </span>
          </div>
        </div>
      )}

      {/* Error message */}
      {validationError && (
        <div className="shrink-0 text-center text-red-500 text-xs">{validationError}</div>
      )}

      {/* No account message */}
      {!selectedAccount && (
        <div className="shrink-0 text-center text-body-secondary text-xs">
          {t("No account available. Please add an account first.")}
        </div>
      )}

      {/* Swap button */}
      <Button
        primary
        fullWidth
        disabled={isSwapDisabled}
        onClick={handleSwapClick}
        className="mt-auto shrink-0"
      >
        {direction === "buy"
          ? t("Buy {{symbol}}", { symbol: dtaoToken?.symbol ?? "Alpha" })
          : t("Sell {{symbol}}", { symbol: dtaoToken?.symbol ?? "Alpha" })}
      </Button>
    </div>
  )
}
