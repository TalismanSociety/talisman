import { Token } from "@talismn/chaindata-provider"
import { SwapIcon } from "@talismn/icons"
import { classNames, planckToTokens, tokensToPlanck } from "@talismn/util"
import { Account } from "extension-core"
import {
  ChangeEventHandler,
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { Button, PillButton } from "talisman-ui"

import { useInputAutoWidth } from "@ui/hooks/useInputAutoWidth"
import { useBalance, useSelectedCurrency } from "@ui/state"

import { currencyConfig } from "../../../Asset/currencyConfig"
import { Fiat } from "../../../Asset/Fiat"
import { TokenLogo } from "../../../Asset/TokenLogo"
import { Tokens } from "../../../Asset/Tokens"
import { TokensAndFiat } from "../../../Asset/TokensAndFiat"
import { BondAccountPicker } from "../../Bond/BondAccountPicker"
import { STAKING_MODAL_CONTENT_CONTAINER_ID } from "../../shared/ModalContent"
import { BittensorAssetAccountSummary } from "../components/BittensorAssetAccountSummary"
import { BittensorStakingModalHeader } from "../components/BittensorModalHeader"
import { BittensorModalLayout } from "../components/BittensorModalLayout"
import { useBittensorBondModal } from "../hooks/useBittensorBondModal"
import { ROOT_NETUID } from "../utils/constants"
import { StakingFeeEstimate } from "./../../shared/StakingFeeEstimate"
import { useBittensorBondWizard } from "./../hooks/useBittensorBondWizard"
import { BittensorAvailableToUnstake } from "./BittensorAvailableToUnstake"
import { BittensorDelegatorNameButton } from "./BittensorDelegatorNameButton"
import { BittensorSelectStakeDrawer } from "./Drawers/BittensorSelectStakeDrawer"

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
    [amountIn, nativeToken?.decimals],
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
  const { nativeToken, dtaoToken, amountTao, amountAlpha, isSubnetUnbond, setPlancks, netuid } =
    useBittensorBondWizard()

  const symbol = useMemo(() => {
    if (isSubnetUnbond) {
      return `SN${netuid}`
    }
    return nativeToken?.symbol
  }, [isSubnetUnbond, netuid, nativeToken?.symbol])

  const formattedValue = useMemo(
    () => (isSubnetUnbond ? (amountAlpha?.tokens ?? "") : (amountTao?.tokens ?? "")),
    [amountTao?.tokens, amountAlpha?.tokens, isSubnetUnbond],
  )

  const [value, setValue] = useState(formattedValue)
  const refSkipSync = useRef(false)

  useEffect(() => {
    if (refSkipSync.current) {
      refSkipSync.current = false
      return
    }
    setValue(formattedValue)
  }, [formattedValue])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      refSkipSync.current = true
      const nextValue = e.target.value
      setValue(nextValue)

      if (!nativeToken || !nextValue.trim()) return setPlancks(null)

      try {
        const plancks = tokensToPlanck(nextValue, nativeToken.decimals)
        setPlancks(BigInt(plancks))
      } catch (err) {
        // invalid input, ignore
        setPlancks(null)
      }
    },
    [setPlancks, nativeToken],
  )

  const refTokensInput = useRef<HTMLInputElement>(null)

  // auto focus if empty
  const refInitialized = useRef(false)
  useEffect(() => {
    if (refInitialized.current) return
    refInitialized.current = true
    if (!amountTao) refTokensInput.current?.focus()
  }, [amountTao, refTokensInput])

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
        value={value}
        className={"text-body peer inline-block w-fit min-w-0 text-ellipsis bg-transparent text-xl"}
        onChange={handleChange}
      />
      <div className="text-body flex shrink-0 items-center gap-2 text-base font-normal">
        <TokenLogo className="text-lg" tokenId={isSubnetUnbond ? dtaoToken?.id : nativeToken?.id} />
        <div>{symbol}</div>
      </div>
    </div>
  )
}

const FiatInput = () => {
  const { nativeToken, tokenRates, amountTao, setPlancks, isSubnetUnbond, swapPrice } =
    useBittensorBondWizard()
  const currency = useSelectedCurrency()

  const formattedValue = useMemo(() => {
    const val = amountTao?.fiat(currency) ?? ""
    return val ? String(Number(val.toFixed(2))) : val
  }, [currency, amountTao])

  const [value, setValue] = useState(formattedValue)
  const refSkipSync = useRef(false)

  useEffect(() => {
    if (refSkipSync.current) {
      refSkipSync.current = false
      return
    }
    setValue(formattedValue)
  }, [formattedValue])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      refSkipSync.current = true
      const nextValue = e.target.value
      setValue(nextValue)

      if (
        nativeToken &&
        tokenRates?.[currency]?.price &&
        nextValue &&
        typeof swapPrice === "bigint"
      ) {
        try {
          const fiat = parseFloat(nextValue)
          let tokens: string = (fiat / tokenRates[currency].price).toFixed(
            Math.ceil(nativeToken.decimals / 3),
          )

          if (isSubnetUnbond) {
            tokens = String(
              (
                Number(tokens) * Number(planckToTokens(swapPrice.toString(), nativeToken.decimals))
              ).toFixed(Math.ceil(nativeToken.decimals / 3)),
            )
          }
          const plancks = tokensToPlanck(tokens, nativeToken.decimals)
          return setPlancks(BigInt(plancks))
        } catch (err) {
          // invalid input, ignore
        }
      }

      return setPlancks(null)
    },

    [nativeToken, tokenRates, currency, swapPrice, setPlancks, isSubnetUnbond],
  )

  const refFiatInput = useRef<HTMLInputElement>(null)

  // auto focus if empty
  const refInitialized = useRef(false)
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
      className="end flex w-full max-w-[400px] flex-row-reverse flex-nowrap items-center justify-center"
    >
      <input
        key="fiatInput"
        ref={refFiatInput}
        type="number"
        inputMode="decimal"
        value={value}
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
    nativeToken,
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
      {!!nativeToken && (
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
    [netuid, stakeDirection],
  )

  const handleSelectAccount = useCallback(
    (address: string) => {
      setAddress(address)
      accountPicker.close()
    },
    [accountPicker, setAddress],
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
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-xs">
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
      </div>

      <div className="bg-grey-900 leading-paragraph flex flex-col gap-2 rounded p-4 text-xs">
        <BondTypeDetails />
        <div
          className={classNames(
            "flex gap-8",
            stakeType === "subnet" ? "flex-col-reverse" : "flex-col",
          )}
        >
          <div className="flex items-center justify-between gap-6">
            <div className="whitespace-nowrap">{t("Select Validator")}</div>
            <div className="text-body truncate">
              <BittensorDelegatorNameButton
                hotkey={hotkey}
                isDisabled={stakeType === "subnet" && !netuid}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-8 pb-2 text-xs">
          <div className="whitespace-nowrap">{t("Estimated Amount")} </div>
          <div className="text-body-secondary flex items-center gap-2 truncate">
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
      <BittensorSelectStakeDrawer containerId={STAKING_MODAL_CONTENT_CONTAINER_ID} />
    </BittensorModalLayout>
  )
}
