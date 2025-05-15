import { Token } from "@talismn/chaindata-provider"
import { SwapIcon } from "@talismn/icons"
import { classNames, planckToTokens, tokensToPlanck } from "@talismn/util"
import { Account } from "extension-core"
import {
  ChangeEventHandler,
  FC,
  PropsWithChildren,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { useTranslation } from "react-i18next"
import { Button, PillButton } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { useInputAutoWidth } from "@ui/hooks/useInputAutoWidth"
import { useBalance, useSelectedCurrency } from "@ui/state"

import { currencyConfig } from "../../../Asset/currencyConfig"
import { Fiat } from "../../../Asset/Fiat"
import { TokenLogo } from "../../../Asset/TokenLogo"
import { Tokens } from "../../../Asset/Tokens"
import { TokensAndFiat } from "../../../Asset/TokensAndFiat"
import { BondAccountPicker } from "../../Bond/BondAccountPicker"
import { BondAccountPillButton } from "../../Bond/BondAccountPillButton"
import { MODAL_CONTENT_CONTAINER_ID } from "../../shared/ModalContent"
import { DTAO_LOGO, ROOT_NETUID } from "../utils/constants"
import { StakingFeeEstimate } from "./../../shared/StakingFeeEstimate"
import { useBittensorBondWizard } from "./../hooks/useBittensorBondWizard"
import { BittensorAvailableToUnstake } from "./BittensorAvailableToUnstake"
import { BittensorDelegatorNameButton } from "./BittensorDelegatorNameButton"
import { BittensorSelectStakeDrawer } from "./Drawers/BittensorSelectStakeDrawer"

const AssetPill: FC<{ token: Token | null }> = ({ token }) => {
  const { t } = useTranslation()

  if (!token) return null

  return (
    <div className="flex h-16 items-center gap-4 px-4">
      <TokenLogo tokenId={token.id} className="shrink-0 text-lg" />
      <div className="flex items-center gap-2">
        <div className="text-body text-base">{token.symbol}</div>
        <div className="bg-body-disabled inline-block size-2 rounded-full"></div>
        <div className="text-body-secondary text-sm">{t("Delegated Staking")}</div>
      </div>
    </div>
  )
}

const AvailableBalance: FC<{ token: Token; account: Account }> = ({ token, account }) => {
  const balance = useBalance(account.address, token.id)

  if (!balance) return null

  return (
    <TokensAndFiat
      isBalance
      tokenId={token?.id}
      planck={balance.transferable.planck}
      className={classNames(balance.status !== "live" && "animate-pulse")}
      tokensClassName="text-body"
      fiatClassName="text-body-secondary"
    />
  )
}

const DisplayContainer: FC<PropsWithChildren> = ({ children }) => {
  return <div className="text-body-secondary max-w-[264px] truncate text-sm">{children}</div>
}

const FiatDisplay = () => {
  const currency = useSelectedCurrency()
  const { tokenRates, amountToStake } = useBittensorBondWizard()

  if (!tokenRates) return null

  return (
    <DisplayContainer>
      <Fiat amount={amountToStake?.fiat(currency) ?? 0} noCountUp />
    </DisplayContainer>
  )
}

const TokenDisplay = () => {
  const { token, stakeDirection, netuid, plancks } = useBittensorBondWizard()

  const tokenPlancks = useMemo(
    () => planckToTokens(String(plancks || 0n), token?.decimals),
    [plancks, token?.decimals],
  )

  const symbol = useMemo(() => {
    if (stakeDirection === "unbond" && netuid !== ROOT_NETUID) {
      return `SN${netuid}`
    }
    return token?.symbol
  }, [netuid, stakeDirection, token?.symbol])

  if (!token) return null

  return (
    <DisplayContainer>
      <Tokens amount={tokenPlancks} decimals={token.decimals} symbol={symbol} noCountUp />
    </DisplayContainer>
  )
}

const TokenInput = () => {
  const { token, amountToStake, amountToStakeAlpha, isSubnetUnbond, setPlancks, netuid } =
    useBittensorBondWizard()

  const symbol = useMemo(() => {
    if (isSubnetUnbond) {
      return `SN${netuid}`
    }
    return token?.symbol
  }, [isSubnetUnbond, netuid, token?.symbol])

  const defaultValue = useMemo(
    () => (isSubnetUnbond ? amountToStakeAlpha?.tokens : (amountToStake?.tokens ?? "")),
    [amountToStake?.tokens, amountToStakeAlpha?.tokens, isSubnetUnbond],
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (token) {
        try {
          const plancks = tokensToPlanck(e.target.value, token.decimals)

          return setPlancks(BigInt(plancks))
        } catch (err) {
          // invalid input, ignore
        }
      }

      return setPlancks(null)
    },
    [setPlancks, token],
  )

  const refTokensInput = useRef<HTMLInputElement>(null)

  // auto focus if empty
  const refInitialized = useRef(false)
  useEffect(() => {
    if (refInitialized.current) return
    refInitialized.current = true
    if (!amountToStake) refTokensInput.current?.focus()
  }, [amountToStake, refTokensInput])

  // resize input to keep content centered
  useInputAutoWidth(refTokensInput)

  return (
    <div className={"flex w-full max-w-[400px] flex-nowrap items-center justify-center gap-4"}>
      <input
        key="tokenInput"
        ref={refTokensInput}
        type="text"
        inputMode="decimal"
        placeholder="0"
        step="any"
        defaultValue={defaultValue}
        className={"text-body peer inline-block w-fit min-w-0 text-ellipsis bg-transparent text-xl"}
        onChange={handleChange}
      />
      <div className="text-body flex shrink-0 items-center gap-2 text-base font-normal">
        {isSubnetUnbond ? (
          <TokenLogo className="text-lg" url={DTAO_LOGO} />
        ) : (
          <TokenLogo className="text-lg" tokenId={token?.id} />
        )}
        <div>{symbol}</div>
      </div>
    </div>
  )
}

const FiatInput = () => {
  const { token, tokenRates, amountToStake, setPlancks, isSubnetUnbond, taoToAlphaConversionRate } =
    useBittensorBondWizard()
  const currency = useSelectedCurrency()

  const defaultValue = useMemo(() => {
    const val = amountToStake?.fiat(currency) ?? ""
    return val ? String(Number(val.toFixed(2))) : val
  }, [currency, amountToStake])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (token && tokenRates?.[currency]?.price && e.target.value) {
        try {
          const fiat = parseFloat(e.target.value)
          let tokens: string = (fiat / tokenRates[currency].price).toFixed(
            Math.ceil(token.decimals / 3),
          )

          if (isSubnetUnbond) {
            tokens = String(
              (Number(tokens) * taoToAlphaConversionRate).toFixed(Math.ceil(token.decimals / 3)),
            )
          }
          const plancks = tokensToPlanck(tokens, token.decimals)
          return setPlancks(BigInt(plancks))
        } catch (err) {
          // invalid input, ignore
        }
      }

      return setPlancks(null)
    },

    [currency, isSubnetUnbond, setPlancks, taoToAlphaConversionRate, token, tokenRates],
  )

  const refFiatInput = useRef<HTMLInputElement>(null)

  // auto focus if empty
  const refInitialized = useRef(false)
  useEffect(() => {
    if (refInitialized.current) return
    refInitialized.current = true
    if (!amountToStake) refFiatInput.current?.focus()
  }, [amountToStake, refFiatInput])

  // resize input to keep content centered
  useInputAutoWidth(refFiatInput)

  if (!tokenRates) return null

  return (
    <div
      // display flex in reverse order to leverage peer css
      className="end flex w-full max-w-[400px] flex-row-reverse flex-nowrap items-center justify-center"
    >
      <input
        key="fiatInput"
        ref={refFiatInput}
        type="number"
        inputMode="decimal"
        defaultValue={defaultValue}
        placeholder={"0.00"}
        className="text-body peer inline-block min-w-0 bg-transparent text-xl"
        onChange={handleChange}
      />
      {/* {isEstimatingMaxAmount && <div className="bg-grey-800 h-16 w-48 rounded"></div>} */}
      <div className="block shrink-0">{currencyConfig[currency]?.symbol}</div>
    </div>
  )
}

export const AmountEdit = () => {
  const { t } = useTranslation()
  const {
    token,
    tokenRates,
    displayMode,
    toggleDisplayMode,
    inputErrorMessage,
    maxPlancks,
    setPlancks,
  } = useBittensorBondWizard()

  const onSetMaxClick = useCallback(() => {
    if (!maxPlancks) return
    setPlancks(maxPlancks)
  }, [maxPlancks, setPlancks])

  return (
    <div className="flex w-full grow flex-col justify-center gap-4">
      {!!token && (
        <>
          <div className="h-16">{/* mirrors the height of error message reserved space */}</div>
          <div className="flex flex-col text-xl font-bold">
            {displayMode === "token" ? <TokenInput /> : <FiatInput />}
          </div>
          <div className={classNames("flex max-w-full items-center justify-center gap-4")}>
            {tokenRates && (
              <>
                {displayMode !== "token" ? <TokenDisplay /> : <FiatDisplay />}
                <PillButton
                  onClick={toggleDisplayMode}
                  size="xs"
                  className="h-[2.2rem] w-[2.2rem] rounded-full !px-0 !py-0"
                >
                  <SwapIcon />
                </PillButton>
              </>
            )}
            <PillButton
              onClick={onSetMaxClick}
              disabled={!maxPlancks}
              size="xs"
              className={classNames("h-[2.2rem] rounded-sm !px-4 !py-0")}
            >
              {t("Max")}
            </PillButton>
          </div>
          <div className="h-16">
            <div className="text-brand-orange line-clamp-2 text-center text-xs">
              {inputErrorMessage}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const FeeEstimate = () => {
  const { feeEstimate, feeToken, isLoadingFeeEstimate, errorFeeEstimate } = useBittensorBondWizard()

  return (
    <StakingFeeEstimate
      plancks={feeEstimate}
      tokenId={feeToken?.id}
      isLoading={isLoadingFeeEstimate}
      error={errorFeeEstimate}
    />
  )
}

type BittensorBondFormBaseProps = {
  BondTypeDetails: React.ComponentType
}

export const BittensorBondFormBase = ({ BondTypeDetails }: BittensorBondFormBaseProps) => {
  const { t } = useTranslation()
  const currency = useSelectedCurrency()
  const {
    account,
    accountPicker,
    token,
    payload,
    poolId,
    selectedSubnet,
    selectStakeDrawer,
    stakeType,
    stakeDirection,
    newStakeTotal,
    netuid,
    expectedTaoWithSlippage,
    estimatedAmountToStake,
    setStep,
    setAddress,
  } = useBittensorBondWizard()

  const isSubnetUnbond = useMemo(
    () => stakeDirection === "unbond" && netuid !== ROOT_NETUID,
    [netuid, stakeDirection],
  )

  return (
    <div className="text-body-secondary flex size-full flex-col gap-4">
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-sm">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="whitespace-nowrap">{t("Asset")}</div>
          <div className="overflow-hidden">
            <AssetPill token={token} />
          </div>
        </div>
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="whitespace-nowrap">{t("Account")}</div>
          <div className="overflow-hidden">
            <Suspense fallback={<SuspenseTracker name="AccountPillButton" />}>
              <BondAccountPillButton address={account?.address} onClick={accountPicker.open} />
            </Suspense>
          </div>
        </div>
      </div>
      <AmountEdit />
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-xs">
        <div className="flex items-center justify-between">
          <div className="whitespace-nowrap">
            {stakeDirection === "bond" ? t("Available Balance") : t("Available to unstake")}
          </div>
          {stakeDirection === "bond" ? (
            <div>
              {!!token && !!account && <AvailableBalance token={token} account={account} />}
            </div>
          ) : (
            <BittensorAvailableToUnstake />
          )}
        </div>
      </div>
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-6 rounded p-4 text-xs">
        <div className="flex items-center justify-between gap-8">
          <div className="whitespace-nowrap">{t("Select Validator")}</div>
          <div className="text-body truncate">
            <BittensorDelegatorNameButton poolId={poolId} />
          </div>
        </div>
        <BondTypeDetails />
        {isSubnetUnbond && (
          <div className="flex items-center justify-between gap-8 pb-2 text-xs">
            <div className="whitespace-nowrap">{t("Estimated Amount")} </div>
            <div className="text-body flex items-center gap-2 truncate">
              <Tokens amount={expectedTaoWithSlippage} symbol={token?.symbol} />
              <Fiat amount={estimatedAmountToStake?.fiat(currency) ?? 0} noCountUp />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-8 pb-2 text-xs">
          <div className="whitespace-nowrap">{t("New staked total")} </div>
          <div className="text-body truncate">
            <Tokens
              amount={planckToTokens(String(newStakeTotal), token?.decimals)}
              symbol={stakeType === "root" ? token?.symbol : selectedSubnet.symbol}
            />
          </div>
        </div>
        {!isSubnetUnbond && (
          <>
            <div className="flex items-center justify-between gap-8">
              <div className="whitespace-nowrap">{t("Estimated Fee")}</div>
              <div className="overflow-hidden">
                <FeeEstimate />
              </div>
            </div>
          </>
        )}
      </div>

      <Button
        primary
        fullWidth
        disabled={!payload}
        onClick={() => setStep(stakeType === "root" ? "review" : "subnet-review")}
      >
        {t("Review")}
      </Button>

      <BondAccountPicker
        isOpen={accountPicker.isOpen}
        account={account}
        token={token}
        handleClose={accountPicker.close}
        setAddress={setAddress}
      />
      <BittensorSelectStakeDrawer
        isOpen={selectStakeDrawer.isOpen}
        onDismiss={selectStakeDrawer.close}
        containerId={MODAL_CONTENT_CONTAINER_ID}
      />
    </div>
  )
}
