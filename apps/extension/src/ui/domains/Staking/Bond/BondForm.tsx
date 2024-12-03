import { Token } from "@talismn/chaindata-provider"
import { InfoIcon, SwapIcon } from "@talismn/icons"
import { classNames, tokensToPlanck } from "@talismn/util"
import { AccountJsonAny } from "extension-core"
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
import { Button, PillButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { useInputAutoWidth } from "@ui/hooks/useInputAutoWidth"
import { useBalance, useSelectedCurrency } from "@ui/state"

import { currencyConfig } from "../../Asset/currencyConfig"
import { Fiat } from "../../Asset/Fiat"
import { TokenLogo } from "../../Asset/TokenLogo"
import Tokens from "../../Asset/Tokens"
import { TokensAndFiat } from "../../Asset/TokensAndFiat"
import { useGetBittensorValidator } from "../hooks/bittensor/useGetBittensorValidator"
import { useStakingAPR } from "../hooks/nomPools/useStakingAPR"
import { BondPoolName } from "../shared/BondPoolName"
import { StakingFeeEstimate } from "../shared/StakingFeeEstimate"
import { StakingUnbondingPeriod } from "../shared/StakingUnbondingPeriod"
import { BondAccountPicker } from "./BondAccountPicker"
import { BondAccountPillButton } from "./BondAccountPillButton"
import { useBondWizard } from "./useBondWizard"

const AssetPill: FC<{ token: Token | null }> = ({ token }) => {
  const { t } = useTranslation()

  if (!token) return null

  const stakeAssetLabel = () => {
    switch (token.chain?.id) {
      case "bittensor":
        return t("Delegated Staking")
      default:
        return t("Pooled Staking")
    }
  }

  return (
    <div className="flex h-16 items-center gap-4 px-4">
      <TokenLogo tokenId={token.id} className="shrink-0 text-lg" />
      <div className="flex items-center gap-2">
        <div className="text-body text-base">{token.symbol}</div>
        <div className="bg-body-disabled inline-block size-2 rounded-full"></div>
        <div className="text-body-secondary text-sm">{stakeAssetLabel()}</div>
      </div>
    </div>
  )
}

const AvailableBalance: FC<{ token: Token; account: AccountJsonAny }> = ({ token, account }) => {
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
  const { tokenRates, formatter } = useBondWizard()

  if (!tokenRates) return null

  return (
    <DisplayContainer>
      <Fiat amount={formatter?.fiat(currency) ?? 0} noCountUp />
    </DisplayContainer>
  )
}

const TokenDisplay = () => {
  const { token, formatter } = useBondWizard()

  if (!token) return null

  return (
    <DisplayContainer>
      <Tokens
        amount={formatter?.tokens ?? 0}
        decimals={token.decimals}
        symbol={token.symbol}
        noCountUp
      />
    </DisplayContainer>
  )
}

const TokenInput = () => {
  const { token, formatter, setPlancks } = useBondWizard()

  const defaultValue = useMemo(() => formatter?.tokens ?? "", [formatter?.tokens])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (token && e.target.value) {
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
    if (!formatter) refTokensInput.current?.focus()
  }, [formatter, refTokensInput])

  // resize input to keep content centered
  useInputAutoWidth(refTokensInput)

  return (
    <div className={"flex w-full max-w-[400px] flex-nowrap items-center justify-center gap-4"}>
      <input
        key="tokenInput"
        ref={refTokensInput}
        type="text"
        inputMode="decimal"
        defaultValue={defaultValue}
        placeholder="0"
        className={"text-body peer inline-block w-fit min-w-0 text-ellipsis bg-transparent text-xl"}
        onChange={handleChange}
      />
      <div className="text-body flex shrink-0 items-center gap-2 text-base font-normal">
        <TokenLogo className="text-lg" tokenId={token?.id} />
        <div>{token?.symbol}</div>
      </div>
    </div>
  )
}

const FiatInput = () => {
  const { token, tokenRates, formatter, setPlancks } = useBondWizard()
  const currency = useSelectedCurrency()

  const defaultValue = useMemo(() => {
    const val = formatter?.fiat(currency) ?? ""
    return val ? String(Number(val.toFixed(2))) : val
  }, [currency, formatter])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (token && tokenRates?.[currency] && e.target.value) {
        try {
          const fiat = parseFloat(e.target.value)
          const tokens = (fiat / tokenRates[currency]!).toFixed(Math.ceil(token.decimals / 3))
          const plancks = tokensToPlanck(tokens, token.decimals)
          return setPlancks(BigInt(plancks))
        } catch (err) {
          // invalid input, ignore
        }
      }

      return setPlancks(null)
    },

    [currency, setPlancks, token, tokenRates],
  )

  const refFiatInput = useRef<HTMLInputElement>(null)

  // auto focus if empty
  const refInitialized = useRef(false)
  useEffect(() => {
    if (refInitialized.current) return
    refInitialized.current = true
    if (!formatter) refFiatInput.current?.focus()
  }, [formatter, refFiatInput])

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
        type="text"
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
    stakeWarningMessage,
    maxPlancks,
    setPlancks,
  } = useBondWizard()

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
            {stakeWarningMessage && (
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-alert-warn flex items-center justify-center gap-1 whitespace-nowrap text-xs">
                      <InfoIcon className="inline-block" /> {stakeWarningMessage}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-[26rem]">
                      <div>
                        {t(
                          "The Bittensor network requires a wait period of 360 blocks since your last stake / unstake action.",
                        )}
                      </div>
                      <div>{t("Please try again later.")}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const StakeApr = () => {
  const { token, poolId } = useBondWizard()
  let data,
    isLoading = false,
    isError = false,
    apr = 0

  const hookMap = {
    nominationPool: useStakingAPR,
    bittensor: useGetBittensorValidator,
  }

  switch (token?.chain?.id) {
    case "bittensor":
      ;({ data, isLoading, isError } = hookMap["bittensor"](poolId))
      apr = Number(data?.data?.[0].apr)
      break
    default:
      ;({ data, isLoading, isError } = hookMap["nominationPool"](token?.chain?.id))
      apr = Number(data)
      break
  }

  const display = useMemo(() => (apr ? `${(apr * 100).toFixed(2)}%` : "N/A"), [apr])

  if (isLoading)
    return <div className="text-grey-700 bg-grey-700 rounded-xs animate-pulse">15.00%</div>

  if (isError) return <div className="text-alert-warn">Unable to fetch APR data</div>

  return (
    <span className={classNames(apr ? "text-alert-success" : "text-body-secondary")}>
      {display}
    </span>
  )
}

const FeeEstimate = () => {
  const { feeEstimate, feeToken, isLoadingFeeEstimate, errorFeeEstimate } = useBondWizard()

  return (
    <StakingFeeEstimate
      plancks={feeEstimate}
      tokenId={feeToken?.id}
      isLoading={isLoadingFeeEstimate}
      error={errorFeeEstimate}
    />
  )
}

export const BondForm = () => {
  const { t } = useTranslation()
  const { account, accountPicker, token, payload, setStep, poolId, bondType } = useBondWizard()

  const bondRowLabel = bondType === "bittensor" ? t("Validator") : t("Pool")

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
          <div className="whitespace-nowrap">{t("Available Balance")}</div>
          <div>{!!token && !!account && <AvailableBalance token={token} account={account} />}</div>
        </div>
      </div>
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-6 rounded p-4 text-xs">
        <div className="flex items-center justify-between gap-8">
          <div className="whitespace-nowrap">{bondRowLabel}</div>
          <div className="text-body truncate">
            <BondPoolName poolId={poolId} chainId={token?.chain?.id} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-8">
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 whitespace-nowrap leading-none">
                  {t("APR")}
                  <InfoIcon />
                </div>
              </TooltipTrigger>
              <TooltipContent>{t("Estimated Annual Percentage Rate (APR)")}</TooltipContent>
            </Tooltip>
          </div>
          <div className={"overflow-hidden font-bold"}>
            <StakeApr />
          </div>
        </div>
        <div className="flex items-center justify-between gap-8">
          <div className="whitespace-nowrap">{t("Unbonding Period")}</div>
          <div className="text-body overflow-hidden">
            <StakingUnbondingPeriod chainId={token?.chain?.id} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-8">
          <div className="whitespace-nowrap">{t("Estimated Fee")}</div>
          <div className="overflow-hidden">
            <FeeEstimate />
          </div>
        </div>
      </div>
      <div></div>
      <Button primary fullWidth disabled={!payload} onClick={() => setStep("review")}>
        {t("Review")}
      </Button>

      <BondAccountPicker />
    </div>
  )
}
