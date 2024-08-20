import { Token } from "@talismn/chaindata-provider"
import { SwapIcon, TalismanEyeIcon } from "@talismn/icons"
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
import { Button, PillButton } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { useBalance } from "@ui/hooks/useBalance"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useInputAutoWidth } from "@ui/hooks/useInputAutoWidth"

import { currencyConfig } from "../Asset/currencyConfig"
import { Fiat } from "../Asset/Fiat"
import { TokenLogo } from "../Asset/TokenLogo"
import Tokens from "../Asset/Tokens"
import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { AccountPillButton } from "./AccountPillButton"
import { InlineStakingAccountPicker } from "./InlineStakingAccountPicker"
import { InlineStakingPoolPicker } from "./InlineStakingPoolPicker"
import { useInlineStakingWizard } from "./useInlineStakingWizard"

const PoolPill: FC<{ name: string | null | undefined; onClick: () => void }> = ({
  name,
  onClick,
}) => {
  //const { t } = useTranslation()

  if (!name) return null

  return (
    <PillButton className="h-12 rounded px-4" onClick={onClick}>
      <div className="flex items-center gap-2">
        <TalismanEyeIcon />
        <div>{name}</div>
      </div>
    </PillButton>
  )
}

const AssetPill: FC<{ token: Token | null }> = ({ token }) => {
  const { t } = useTranslation()

  if (!token) return null

  return (
    <PillButton className="h-16 rounded px-4">
      <div className="flex items-center gap-4">
        <TokenLogo tokenId={token.id} className="shrink-0 text-lg" />
        <div className="flex items-center gap-2">
          <div className="text-body text-base">{token.symbol}</div>
          <div className="bg-body-disabled inline-block size-2 rounded-full"></div>
          <div className="text-body-secondary text-sm">{t("Pooled Staking")}</div>
        </div>
      </div>
    </PillButton>
  )
}

const AvailableBalance: FC<{ token: Token; account: AccountJsonAny }> = ({ token, account }) => {
  const balance = useBalance(account.address, token.id)

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
  const { tokenRates, formatter } = useInlineStakingWizard()

  // const value = sendMax ? maxAmount : transfer

  if (!tokenRates) return null

  return (
    <DisplayContainer>
      <Fiat amount={formatter?.fiat(currency) ?? 0} noCountUp />
    </DisplayContainer>
  )
}

const TokenDisplay = () => {
  const { token, formatter } = useInlineStakingWizard()

  // const value = sendMax ? maxAmount : transfer

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
  const { token, formatter, setPlancks } = useInlineStakingWizard()

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
    [setPlancks, token]
  )

  const refTokensInput = useRef<HTMLInputElement>(null)
  const refInitialized = useRef(false)
  useEffect(() => {
    if (refInitialized.current) return
    refInitialized.current = true
    if (!formatter) refTokensInput.current?.focus()
  }, [formatter, refTokensInput])

  const resizeTokensInput = useInputAutoWidth(refTokensInput)
  useEffect(() => {
    resizeTokensInput()
  }, [resizeTokensInput, token?.symbol])

  return (
    <div
      className={classNames(
        "flex w-full max-w-[400px] flex-nowrap items-center justify-center gap-4"
        //isEstimatingMaxAmount && "animate-pulse"
      )}
    >
      {/* {isEstimatingMaxAmount && <div className="bg-grey-800 h-16 w-48 rounded"></div>} */}
      <input
        key="tokenInput"
        ref={refTokensInput}
        type="text"
        inputMode="decimal"
        defaultValue={defaultValue}
        placeholder="0"
        className={classNames(
          "text-body peer inline-block w-fit min-w-0 text-ellipsis bg-transparent text-xl"
          // sendMax && "placeholder:text-white",
          // isEstimatingMaxAmount && "hidden" // hide until value is known
        )}
        onChange={handleChange}
      />
      <div className="text-body flex shrink-0 items-center gap-2 text-base font-normal">
        <TokenLogo className="text-lg" tokenId={token?.id} />
        <div>{token?.symbol}</div>
      </div>
      {/* <TokenPillButton tokenId={tokenId} onClick={onTokenClick} /> */}
    </div>
  )
}

const FiatInput = () => {
  const { token, tokenRates, formatter, setPlancks } = useInlineStakingWizard()
  const currency = useSelectedCurrency()
  //const currencyConfig = useCurren
  const defaultValue = useMemo(() => formatter?.fiat(currency) ?? "", [currency, formatter])
  // const {
  //   token,
  //   transfer,
  //   maxAmount,
  //   tokenRates,
  //   isEstimatingMaxAmount,
  //   refFiatInput,
  //   resizeFiatInput,
  // } = useSendFunds()

  // const currency = useSelectedCurrency()

  // const defaultValue = useMemo(
  //   () =>
  //     normalizeStringNumber(
  //       sendMax && maxAmount ? maxAmount.fiat(currency) : transfer?.fiat(currency),
  //       2
  //     ),
  //   [currency, maxAmount, sendMax, transfer]
  // )

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // debounce((e) => {
    //   if (sendMax) set("sendMax", false)

    //   const text = e.target.value ?? ""
    //   const num = Number(text)
    //   const tokenRate = tokenRates?.[currency]

    //   if (token && tokenRate && text.length && !isNaN(num)) {
    //     const fiat = parseFloat(text)
    //     const tokens = (fiat / tokenRate).toFixed(Math.ceil(token.decimals / 3))
    //     set("amount", tokensToPlanck(tokens, token.decimals))
    //   } else remove("amount")
    // }, 250),
    [currency, setPlancks, token, tokenRates]
  )

  const refFiatInput = useRef<HTMLInputElement>(null)
  const resizeFiatInput = useInputAutoWidth(refFiatInput)
  useEffect(() => {
    resizeFiatInput()
  }, [resizeFiatInput])

  if (!tokenRates) return null

  return (
    <div
      className={classNames(
        // display flex in reverse order to leverage peer css
        "end flex w-full max-w-[400px] flex-row-reverse flex-nowrap items-center justify-center"
        // isEstimatingMaxAmount && "animate-pulse"
      )}
    >
      <input
        key="fiatInput"
        ref={refFiatInput}
        type="text"
        defaultValue={defaultValue}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        //autoFocus={!sendMax && !transfer}
        placeholder={"0.00"}
        className={classNames(
          "text-body peer inline-block min-w-0 bg-transparent text-xl"
          //   isEstimatingMaxAmount && "hidden" // hide until value is known
        )}
        onChange={handleChange}
      />
      {/* {isEstimatingMaxAmount && <div className="bg-grey-800 h-16 w-48 rounded"></div>} */}
      <div
        className={classNames(
          "block shrink-0"
          // isEstimatingMaxAmount ? "text-grey-800" : "peer-placeholder-shown:text-body-disabled"
        )}
      >
        {currencyConfig[currency]?.symbol}
      </div>
    </div>
  )
}

export const AmountEdit = () => {
  const { t } = useTranslation()
  const { token, tokenRates, displayMode, toggleDisplayMode } = useInlineStakingWizard()
  //const [isTokenEdit, setIsTokenEdit] = useState(true)
  // const { onSendMaxClick, tokenRates, isEstimatingMaxAmount, maxAmount, token } = useSendFunds()

  const onSetMaxClick = useCallback(() => {}, [])

  return (
    <div className="flex w-full grow flex-col justify-center gap-4">
      {!!token && (
        <>
          <div className="h-16">{/* mirrors the height of error message reserved space */}</div>
          <div className="flex flex-col text-xl font-bold">
            {displayMode === "token" ? <TokenInput /> : <FiatInput />}
            {/* {isTokenEdit ? <TokenInput onTokenClick={onTokenClick} /> : <FiatInput />} */}
          </div>
          <div
            className={classNames(
              "flex max-w-full items-center justify-center gap-4"
              // TODO isEstimatingMaxAmount && "invisible"
            )}
          >
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
              disabled // TODO ={!maxAmount}
              size="xs"
              className={classNames("h-[2.2rem] rounded-sm !px-4 !py-0")}
            >
              {t("Max")}
            </PillButton>
          </div>
          <div className="h-16">
            <div className="text-brand-orange line-clamp-2 text-center text-xs">
              This is an error message
              {/* TODO <ErrorMessage /> */}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
export const InlineStakingForm = () => {
  const { t } = useTranslation()
  const { account, accountPicker, token, pool, poolPicker } = useInlineStakingWizard()

  return (
    <div className="text-body-secondary flex size-full flex-col gap-4">
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-sm">
        <div className="flex h-16 items-center justify-between">
          <div>{t("Asset")}</div>
          <div>
            <AssetPill token={token} />
          </div>
        </div>
        <div className="flex h-16 items-center justify-between">
          <div>{t("Account")}</div>
          <div>
            <Suspense fallback={<SuspenseTracker name="AccountPillButton" />}>
              <AccountPillButton address={account?.address} onClick={accountPicker.open} />
            </Suspense>
          </div>
        </div>
      </div>
      <AmountEdit />
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-xs">
        <div className="flex items-center justify-between">
          <div>{t("Available Balance")}</div>
          <div>{!!token && !!account && <AvailableBalance token={token} account={account} />}</div>
        </div>
      </div>
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-xs">
        <div className="flex h-12 items-center justify-between">
          <div>{t("Pool")}</div>
          <div>
            <PoolPill name={pool?.name} onClick={poolPicker.open} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>{t("APY")}</div>
          <div className="text-alert-success font-bold">17.8% APY</div>
        </div>
        <div className="flex items-center justify-between">
          <div>{t("Unbonding Period")}</div>
          <div className="text-body">{t("{{days}} Days", { days: 28 })}</div>
        </div>
        <div className="flex items-center justify-between">
          <div>{t("Estimated Fee")}</div>
          <div>
            <TokensAndFiat
              isBalance
              tokenId={token?.id}
              planck={100000000n}
              // className={classNames(balance.status !== "live" && "animate-pulse")}
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
            />
          </div>
        </div>
      </div>
      <div></div>
      <Button primary fullWidth>
        {t("Review")}
      </Button>

      <InlineStakingAccountPicker />
      <InlineStakingPoolPicker />
    </div>
  )
}