import type { Account } from "@core/domains/keyring/exports"
import { ALPHA_PRICE_SCALE } from "@talismn/balances"
import type { Token } from "@talismn/chaindata-provider"
import { SwapIcon } from "@talismn/icons"
import { planckToTokens, tokensToPlanck } from "@talismn/util"
import { Button } from "@ui/components/Button"
import { PillButton } from "@ui/components/PillButton"
import { useErrorShown } from "@ui/hooks/analytics/errorShown"
import { useInputAutoWidth } from "@ui/hooks/useInputAutoWidth"
import { useBalance } from "@ui/state/balances"
import { useSelectedCurrency } from "@ui/state/settings"
import { cn } from "@ui/util/cn"
import {
  type ChangeEventHandler,
  type FC,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { useTranslation } from "react-i18next"
import { currencyConfig } from "../../../Asset/currencyConfig"
import { Fiat } from "../../../Asset/Fiat"
import { TokenLogo } from "../../../Asset/TokenLogo"
import { Tokens } from "../../../Asset/Tokens"
import { TokensAndFiat } from "../../../Asset/TokensAndFiat"
import { BondAccountPicker } from "../../Bond/BondAccountPicker"
import { STAKING_MODAL_CONTENT_CONTAINER_ID } from "../../shared/ModalContent"
import { StakingFeeEstimate } from "./../../shared/StakingFeeEstimate"
import { BittensorAssetAccountSummary } from "../components/BittensorAssetAccountSummary"
import { BittensorModalLayout } from "../components/BittensorModalLayout"
import { BittensorStakingModalHeader } from "../components/BittensorStakingModalHeader"
import { useBittensorBondModal } from "../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "./../hooks/useBittensorBondWizard"
import { ROOT_NETUID } from "../utils/constants"
import { amountToFiat, type FiatConversion, fiatToAmount } from "../utils/fiatAmount"
import {
  BittensorAvailableToUnstake,
  BittensorConvictionLockedRow,
} from "./BittensorAvailableToUnstake"
import { BittensorDelegatorNameButton } from "./BittensorDelegatorNameButton"
import { BittensorClaimRewardsRow } from "./Forms/BittensorClaimRewardsRow"
import { useAmountField } from "./useAmountField"

const AvailableBalance: FC<{ token: Token; account: Account }> = ({ token, account }) => {
  const balance = useBalance(account.address, token.id)

  if (!balance) return null

  return (
    <TokensAndFiat
      isBalance
      tokenId={token?.id}
      planck={balance.transferable.planck}
      className={cn(balance.status !== "live" && "animate-pulse")}
      tokensClassName="text-body"
      fiatClassName="text-body-secondary"
    />
  )
}

const DisplayContainer: FC<PropsWithChildren> = ({ children }) => {
  return <div className="max-w-66 truncate text-body-secondary text-sm">{children}</div>
}

const FiatDisplay = () => {
  const currency = useSelectedCurrency()
  const { tokenRates, amountTao } = useBittensorBondWizard()

  if (!tokenRates) return null

  return (
    <DisplayContainer>
      <Fiat amount={amountTao?.fiat(currency) ?? 0} noCountUp />
    </DisplayContainer>
  )
}

const TokenDisplay = () => {
  const { nativeToken, stakeDirection, netuid, amountIn } = useBittensorBondWizard()

  const tokenPlancks = useMemo(
    () => planckToTokens(String(amountIn || 0n), nativeToken?.decimals),
    [amountIn, nativeToken?.decimals]
  )

  const symbol = useMemo(() => {
    if (stakeDirection === "unbond" && netuid !== ROOT_NETUID) {
      return `SN${netuid}`
    }
    return nativeToken?.symbol
  }, [netuid, stakeDirection, nativeToken?.symbol])

  if (!nativeToken) return null

  return (
    <DisplayContainer>
      <Tokens amount={tokenPlancks} decimals={nativeToken.decimals} symbol={symbol} noCountUp />
    </DisplayContainer>
  )
}

const TokenInput = () => {
  const {
    nativeToken,
    dtaoToken,
    amountIn,
    amountTao,
    amountAlpha,
    isSubnetUnbond,
    setPlancks,
    netuid,
  } = useBittensorBondWizard()

  const symbol = useMemo(() => {
    if (isSubnetUnbond) {
      return `SN${netuid}`
    }
    return nativeToken?.symbol
  }, [isSubnetUnbond, netuid, nativeToken?.symbol])

  const formattedValue = useMemo(
    () => (isSubnetUnbond ? (amountAlpha?.tokens ?? "") : (amountTao?.tokens ?? "")),
    [amountTao?.tokens, amountAlpha?.tokens, isSubnetUnbond]
  )

  const parse = useCallback(
    (text: string) => {
      if (!nativeToken || !text.trim()) return null
      try {
        return BigInt(tokensToPlanck(text, nativeToken.decimals))
      } catch {
        return null
      }
    },
    [nativeToken]
  )

  const [value, setValue] = useAmountField(amountIn, formattedValue, parse, setPlancks)

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => setValue(e.target.value),
    [setValue]
  )

  const refTokensInput = useRef<HTMLInputElement>(null)

  // auto focus if empty
  const refInitialized = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    if (refInitialized.current) return
    refInitialized.current = true
    if (!amountTao) refTokensInput.current?.focus()
  }, [amountTao, refTokensInput])

  // resize input to keep content centered
  useInputAutoWidth(refTokensInput)

  return (
    <div className={"flex w-full max-w-100 flex-nowrap items-center justify-center gap-4"}>
      <input
        key="tokenInput"
        ref={refTokensInput}
        type="text"
        inputMode="decimal"
        placeholder="0"
        step="any"
        value={value}
        className={"peer inline-block w-fit min-w-0 text-ellipsis bg-transparent text-body text-xl"}
        onChange={handleChange}
      />
      <div className="flex shrink-0 items-center gap-2 font-normal text-base text-body">
        <TokenLogo className="text-lg" tokenId={isSubnetUnbond ? dtaoToken?.id : nativeToken?.id} />
        <div>{symbol}</div>
      </div>
    </div>
  )
}

const FiatInput = () => {
  const { nativeToken, tokenRates, amountIn, amountTao, setPlancks, isSubnetUnbond, alphaPrice } =
    useBittensorBondWizard()
  const currency = useSelectedCurrency()
  const decimals = nativeToken?.decimals

  const conversion = useMemo<FiatConversion | null>(() => {
    const fiatPrice = tokenRates?.[currency]?.price
    const taoPerUnit = isSubnetUnbond ? alphaPrice : ALPHA_PRICE_SCALE
    if (decimals === undefined || !fiatPrice || typeof taoPerUnit !== "bigint") return null
    return { fiatPrice, decimals, taoPerUnit }
  }, [tokenRates, currency, isSubnetUnbond, alphaPrice, decimals])

  const formattedValue = useMemo(
    () => (amountIn !== null && conversion ? amountToFiat(amountIn, conversion) : ""),
    [amountIn, conversion]
  )

  const parse = useCallback(
    (text: string) => (conversion ? fiatToAmount(text, conversion) : null),
    [conversion]
  )

  const [value, setValue] = useAmountField(amountIn, formattedValue, parse, setPlancks)

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => setValue(e.target.value),
    [setValue]
  )

  const refFiatInput = useRef<HTMLInputElement>(null)

  // auto focus if empty
  const refInitialized = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    if (refInitialized.current) return
    refInitialized.current = true
    if (!amountTao) refFiatInput.current?.focus()
  }, [amountTao, refFiatInput])

  // resize input to keep content centered
  useInputAutoWidth(refFiatInput)

  if (!tokenRates) return null

  return (
    <div
      // display flex in reverse order to leverage peer css
      className="end flex w-full max-w-100 flex-row-reverse flex-nowrap items-center justify-center"
    >
      <input
        key="fiatInput"
        ref={refFiatInput}
        type="number"
        inputMode="decimal"
        value={value}
        placeholder={"0.00"}
        className="peer inline-block min-w-0 bg-transparent text-body text-xl"
        onChange={handleChange}
      />
      <div className="block shrink-0">{currencyConfig[currency]?.symbol}</div>
    </div>
  )
}

const AmountEdit = () => {
  const { t } = useTranslation()
  const {
    nativeToken,
    tokenRates,
    displayMode,
    toggleDisplayMode,
    inputErrorMessage,
    inputErrorCategory,
    maxPlancks,
    inputErrorFillAmount,
    setPlancks,
  } = useBittensorBondWizard()
  useErrorShown({
    shown: inputErrorMessage,
    surface: "field",
    category: inputErrorCategory ?? "input_invalid",
    field: "amount",
  })

  const onSetMaxClick = useCallback(() => {
    if (!maxPlancks) return
    setPlancks(maxPlancks)
  }, [maxPlancks, setPlancks])

  const onFillClick = useCallback(() => {
    if (inputErrorFillAmount === null) return
    setPlancks(inputErrorFillAmount)
  }, [inputErrorFillAmount, setPlancks])

  return (
    <div className="flex w-full grow flex-col justify-center gap-4">
      {!!nativeToken && (
        <>
          <div className="h-16">{/* mirrors the height of error message reserved space */}</div>
          <div className="flex flex-col font-bold text-xl">
            {displayMode === "token" ? <TokenInput /> : <FiatInput />}
          </div>
          <div className={cn("flex max-w-full items-center justify-center gap-4")}>
            {tokenRates && (
              <>
                {displayMode !== "token" ? <TokenDisplay /> : <FiatDisplay />}
                <PillButton
                  onClick={toggleDisplayMode}
                  size="xs"
                  className="h-11 w-11 rounded-full px-0! py-0!"
                >
                  <SwapIcon />
                </PillButton>
              </>
            )}
            <PillButton
              onClick={onSetMaxClick}
              disabled={!maxPlancks}
              size="xs"
              className={cn("h-11 rounded-sm px-4! py-0!")}
            >
              {t("Max")}
            </PillButton>
          </div>
          <div className="h-16">
            {inputErrorFillAmount === null ? (
              <div className="line-clamp-2 text-center text-brand-orange text-xs">
                {inputErrorMessage}
              </div>
            ) : (
              <button
                type="button"
                onClick={onFillClick}
                className="line-clamp-2 w-full text-center text-brand-orange text-xs underline-offset-2 hover:underline"
              >
                {inputErrorMessage}
              </button>
            )}
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
  const {
    account,
    accountPicker,
    nativeToken,
    dtaoToken,
    payload,
    hotkey,
    stakeType,
    stakeDirection,
    netuid,
    amountOut,
    setStep,
    setAddress,
  } = useBittensorBondWizard()
  const { close } = useBittensorBondModal()

  const isSubnetUnbond = useMemo(
    () => stakeDirection === "unbond" && netuid !== ROOT_NETUID,
    [netuid, stakeDirection]
  )

  const handleSelectAccount = useCallback(
    (address: string) => {
      setAddress(address)
      accountPicker.close()
    },
    [accountPicker, setAddress]
  )

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader
          title={stakeDirection === "bond" ? t("Staking") : t("Unstake")}
          withClose
          onCloseModal={close}
        />
      }
      contentClassName="text-body-secondary flex size-full flex-col gap-4 p-12 pt-0"
    >
      <BittensorAssetAccountSummary
        token={nativeToken}
        accountAddress={account?.address}
        onAccountClick={() => {
          stakeDirection === "bond" ? accountPicker.open() : setStep("select-position")
        }}
        assetLabel={t("Asset")}
        accountLabel={t("Account")}
      />
      <AmountEdit />
      <div className="flex flex-col gap-4 rounded bg-grey-900 p-4 text-xs leading-paragraph">
        <div className="flex items-center justify-between">
          <div className="whitespace-nowrap">
            {stakeDirection === "bond" ? t("Available Balance") : t("Available to unstake")}
          </div>
          {stakeDirection === "bond" ? (
            <div>
              {!!nativeToken && !!account && (
                <AvailableBalance token={nativeToken} account={account} />
              )}
            </div>
          ) : (
            <BittensorAvailableToUnstake />
          )}
        </div>
        {stakeDirection === "unbond" && <BittensorConvictionLockedRow />}
      </div>

      <div className="flex flex-col gap-2 rounded bg-grey-900 p-4 text-xs leading-paragraph">
        <BondTypeDetails />
        <div className={cn("flex gap-8", stakeType === "subnet" ? "flex-col-reverse" : "flex-col")}>
          <div className="flex items-center justify-between gap-6">
            <div className="whitespace-nowrap">{t("Select Validator")}</div>
            <div className="truncate text-body">
              <BittensorDelegatorNameButton
                hotkey={hotkey}
                isDisabled={stakeType === "subnet" && !netuid}
              />
            </div>
          </div>
        </div>
        {/* root staking is 1:1 with native TAO: there is no amount to estimate */}
        {netuid !== ROOT_NETUID && (
          <div className="flex items-center justify-between gap-8 pb-2 text-xs">
            <div className="whitespace-nowrap">{t("Estimated Amount")} </div>
            <div className="flex items-center gap-2 truncate text-body-secondary">
              {!!amountOut && (
                <TokensAndFiat
                  planck={amountOut}
                  tokenId={isSubnetUnbond ? nativeToken?.id : dtaoToken?.id}
                  noCountUp
                  tokensClassName="text-body"
                />
              )}
            </div>
          </div>
        )}
        <BittensorClaimRewardsRow />
        {!isSubnetUnbond && (
          <div className="flex items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Estimated Fee")}</div>
            <div className="overflow-hidden">
              <FeeEstimate />
            </div>
          </div>
        )}
      </div>

      <Button
        primary
        fullWidth
        className="mt-6"
        disabled={!payload}
        onClick={() => setStep("review")}
      >
        {t("Review")}
      </Button>

      <BondAccountPicker
        containerId={STAKING_MODAL_CONTENT_CONTAINER_ID}
        isOpen={accountPicker.isOpen}
        account={account}
        token={nativeToken}
        onBackClick={accountPicker.close}
        onCloseClick={close}
        onAddressSelected={handleSelectAccount}
      />
    </BittensorModalLayout>
  )
}
