import { log } from "@core/log"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { WithTooltip } from "@talisman/components/Tooltip"
import { convertAddress } from "@talisman/util/convertAddress"
import { AccountAddressType } from "@talisman/util/getAddressType"
import { AlertCircleIcon, SwapIcon, UserPlusIcon } from "@talismn/icons"
import { classNames, tokensToPlanck } from "@talismn/util"
import { SendFundsWizardPage, useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import useToken from "@ui/hooks/useToken"
import { isEvmToken } from "@ui/util/isEvmToken"
import debounce from "lodash/debounce"
import {
  ChangeEventHandler,
  DetailedHTMLProps,
  FC,
  FormEvent,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Container } from "react-dom"
import { useTranslation } from "react-i18next"
import { Button, PillButton } from "talisman-ui"

import { AccountIcon } from "../../Account/AccountIcon"
import { AccountTypeIcon } from "../../Account/AccountTypeIcon"
import { Address } from "../../Account/Address"
import { ChainLogo } from "../../Asset/ChainLogo"
import currencyConfig from "../../Asset/currencyConfig"
import { Fiat } from "../../Asset/Fiat"
import { TokenLogo } from "../../Asset/TokenLogo"
import Tokens from "../../Asset/Tokens"
import { TokensAndFiat } from "../../Asset/TokensAndFiat"
import { EthFeeSelect } from "../../Ethereum/GasSettings/EthFeeSelect"
import { AddToAddressBookDrawer } from "../Drawers/AddToAddressBookDrawer"
import { ForfeitWarningDrawer } from "../Drawers/ForfeitWarningDrawer"
import { SendFundsFeeTooltip } from "../SendFundsFeeTooltip"
import { useGenesisHashFromTokenId } from "../useGenesisHashFromTokenId"
import { useNetworkDetails } from "../useNetworkDetails"
import { useSendFunds } from "../useSendFunds"

const normalizeStringNumber = (value?: string | number | null, decimals = 18) => {
  try {
    // fixes the decimals and remove all leading/trailing zeros
    return value ? Number(Number(value).toFixed(decimals)).toString() : ""
  } catch (err) {
    log.error("normalizeStringNumber", { value, decimals, err })
    return ""
  }
}

const useContact = (address?: string | null) => {
  const { contacts } = useAddressBook()

  return useMemo(() => {
    if (!address) return undefined
    const genericAddress = convertAddress(address, null)
    return contacts?.find((c) => convertAddress(c.address, null) === genericAddress)
  }, [address, contacts])
}

type ContainerProps = DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>

const Container: FC<ContainerProps> = (props) => {
  return (
    <div
      {...props}
      className={classNames("bg-grey-900 text-body-secondary rounded", props.className)}
    />
  )
}

type AddressPillButtonProps = {
  address?: string | null
  genesisHash?: string | null
  className?: string
  onClick?: () => void
}

const AddressPillButton: FC<AddressPillButtonProps> = ({
  address,
  genesisHash,
  className,
  onClick,
}) => {
  const account = useAccountByAddress(address as string)
  const contact = useContact(address)

  const { name, genesisHash: accountGenesisHash } = useMemo(() => {
    if (account) return account
    if (contact) return { name: contact.name, genesisHash: undefined }
    return { name: undefined, genesisHash: undefined }
  }, [account, contact])

  const formattedAddress = useFormattedAddress(
    address ?? undefined,
    genesisHash ?? accountGenesisHash
  )
  const displayAddress = useMemo(
    () => (account ? formattedAddress : address) ?? undefined,
    [account, address, formattedAddress]
  )

  if (!address) return null

  return (
    <PillButton className={classNames("h-16 max-w-full !px-4", className)} onClick={onClick}>
      <div className="text-body flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base">
        <AccountIcon className="!text-lg" address={address} genesisHash={accountGenesisHash} />
        <div className="leading-base grow truncate">
          {name ? (
            <WithTooltip tooltip={displayAddress}>{name}</WithTooltip>
          ) : (
            <Address address={displayAddress} startCharCount={6} endCharCount={6} />
          )}
        </div>
        <AccountTypeIcon origin={account?.origin} className="text-primary-500" />
      </div>
    </PillButton>
  )
}

type TokenPillButtonProps = { tokenId?: string | null; className?: string; onClick?: () => void }

const TokenPillButton: FC<TokenPillButtonProps> = ({ tokenId, className, onClick }) => {
  const token = useToken(tokenId as string)

  if (!tokenId || !token) return null

  return (
    <PillButton className={classNames("h-16 !px-4 !py-2", className)} onClick={onClick}>
      <div className="text-body flex  flex-nowrap items-center gap-4 text-base">
        <div className="shrink-0">
          <TokenLogo className="!text-lg" tokenId={tokenId} />
        </div>
        <div>{token.symbol}</div>
      </div>
    </PillButton>
  )
}

const TokenInput = () => {
  const { set, remove } = useSendFundsWizard()
  const {
    token,
    transfer,
    maxAmount,
    isEstimatingMaxAmount,
    sendMax,
    refTokensInput,
    resizeTokensInput,
  } = useSendFunds()

  const defaultValue = useMemo(
    () =>
      normalizeStringNumber(
        sendMax && maxAmount ? maxAmount.tokens : transfer?.tokens,
        token?.decimals
      ),
    [maxAmount, sendMax, token?.decimals, transfer?.tokens]
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    debounce((e) => {
      if (sendMax) set("sendMax", false)

      const text = e.target.value ?? ""
      const num = Number(text)

      if (token && text.length && !isNaN(num)) set("amount", tokensToPlanck(text, token.decimals))
      else remove("amount")
    }, 250),
    [remove, sendMax, set, token]
  )

  const refInitialized = useRef(false)
  useEffect(() => {
    if (refInitialized.current) return
    refInitialized.current = true
    if (!sendMax && !transfer) refTokensInput.current?.focus()
  }, [refTokensInput, sendMax, transfer])

  useEffect(() => {
    resizeTokensInput()
  }, [resizeTokensInput, token?.symbol])

  return (
    <div
      className={classNames(
        "flex w-full max-w-[400px] flex-nowrap items-center justify-center gap-4",
        isEstimatingMaxAmount && "animate-pulse"
      )}
    >
      {isEstimatingMaxAmount && <div className="bg-grey-800 h-16 w-48 rounded"></div>}
      <input
        key="tokenInput"
        ref={refTokensInput}
        type="text"
        inputMode="decimal"
        defaultValue={defaultValue}
        placeholder={`0 ${token?.symbol}`}
        className={classNames(
          "text-body peer inline-block min-w-0 bg-transparent text-xl",
          sendMax && "placeholder:text-white",
          isEstimatingMaxAmount && "hidden" // hide until value is known
        )}
        onChange={handleChange}
      />
      <div
        className={classNames(
          "block shrink-0 ",
          isEstimatingMaxAmount ? "text-grey-800" : "peer-placeholder-shown:hidden"
        )}
      >
        {token?.symbol}
      </div>
    </div>
  )
}

const FiatInput = () => {
  const { set, remove, sendMax } = useSendFundsWizard()
  const {
    token,
    transfer,
    maxAmount,
    tokenRates,
    isEstimatingMaxAmount,
    refFiatInput,
    resizeFiatInput,
  } = useSendFunds()

  const currency = useSelectedCurrency()

  const defaultValue = useMemo(
    () =>
      normalizeStringNumber(
        sendMax && maxAmount ? maxAmount.fiat(currency) : transfer?.fiat(currency),
        2
      ),
    [currency, maxAmount, sendMax, transfer]
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    debounce((e) => {
      if (sendMax) set("sendMax", false)

      const text = e.target.value ?? ""
      const num = Number(text)
      const tokenRate = tokenRates?.[currency]

      if (token && tokenRate && text.length && !isNaN(num)) {
        const fiat = parseFloat(text)
        const tokens = (fiat / tokenRate).toFixed(Math.ceil(token.decimals / 3))
        set("amount", tokensToPlanck(tokens, token.decimals))
      } else remove("amount")
    }, 250),
    [remove, sendMax, set, token, tokenRates]
  )

  useEffect(() => {
    resizeFiatInput()
  }, [resizeFiatInput])

  if (!tokenRates) return null

  return (
    <div
      className={classNames(
        // display flex in reverse order to leverage peer css
        "end flex w-full max-w-[400px] flex-row-reverse flex-nowrap items-center justify-center",
        isEstimatingMaxAmount && "animate-pulse"
      )}
    >
      <input
        key="fiatInput"
        ref={refFiatInput}
        type="text"
        defaultValue={defaultValue}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={!sendMax && !transfer}
        placeholder={"0.00"}
        className={classNames(
          "text-body peer inline-block min-w-0 bg-transparent text-xl",
          isEstimatingMaxAmount && "hidden" // hide until value is known
        )}
        onChange={handleChange}
      />
      {isEstimatingMaxAmount && <div className="bg-grey-800 h-16 w-48 rounded"></div>}
      <div
        className={classNames(
          "block shrink-0",
          isEstimatingMaxAmount ? "text-grey-800" : "peer-placeholder-shown:text-body-disabled"
        )}
      >
        {currencyConfig[currency]?.unicodeCharacter}
      </div>
    </div>
  )
}

const DisplayContainer: FC<PropsWithChildren> = ({ children }) => {
  return <div className="text-body-secondary max-w-[264px] truncate text-sm">{children}</div>
}

const FiatDisplay = () => {
  const { tokenRates, transfer, maxAmount, sendMax } = useSendFunds()

  const value = sendMax ? maxAmount : transfer

  if (!tokenRates || !value) return null

  return (
    <DisplayContainer>
      <Fiat amount={value} noCountUp />
    </DisplayContainer>
  )
}

const TokenDisplay = () => {
  const { token, transfer, maxAmount, sendMax } = useSendFunds()

  const value = sendMax ? maxAmount : transfer

  if (!token || !value) return null

  return (
    <DisplayContainer>
      <Tokens
        amount={value.tokens ?? "0"}
        decimals={token.decimals}
        symbol={token.symbol}
        noCountUp
      />
    </DisplayContainer>
  )
}

const ErrorMessage = () => {
  const { error, errorDetails } = useSendFunds()

  return error ? (
    <WithTooltip tooltip={errorDetails}>
      <AlertCircleIcon className="inline-block align-text-top text-sm" /> {error}
    </WithTooltip>
  ) : null
}

const AmountEdit = () => {
  const { t } = useTranslation("send-funds")
  const [isTokenEdit, setIsTokenEdit] = useState(true)
  const { onSendMaxClick, tokenRates, isEstimatingMaxAmount, maxAmount, token } = useSendFunds()

  const toggleIsTokenEdit = useCallback(() => {
    setIsTokenEdit((prev) => !prev)
  }, [])

  return (
    <div className="w-full grow">
      {!!token && (
        <>
          <div className="flex h-[12rem] flex-col justify-end text-xl font-bold">
            {isTokenEdit ? <TokenInput /> : <FiatInput />}
          </div>
          <div
            className={classNames(
              "mt-4 flex max-w-full items-center justify-center gap-6",
              isEstimatingMaxAmount && "invisible"
            )}
          >
            {tokenRates && (
              <>
                {!isTokenEdit ? <TokenDisplay /> : <FiatDisplay />}
                <PillButton
                  onClick={toggleIsTokenEdit}
                  size="xs"
                  className="h-[2.2rem] w-[2.2rem] rounded-full !px-0 !py-0"
                >
                  <SwapIcon />
                </PillButton>
              </>
            )}
            <PillButton
              onClick={onSendMaxClick}
              disabled={!maxAmount}
              size="xs"
              className={classNames("h-[2.2rem] rounded-sm !px-4 !py-0")}
            >
              {t("Max")}
            </PillButton>
          </div>
          <div className="text-brand-orange mt-4 text-center text-xs">
            <ErrorMessage />
          </div>
        </>
      )}
    </div>
  )
}

const TokenRow = ({ onEditClick }: { onEditClick: () => void }) => {
  const { tokenId, balance, token } = useSendFunds()

  return (
    <Container className="flex h-[50px] w-full items-center justify-between px-6 py-4">
      <div>
        <TokenPillButton tokenId={tokenId} onClick={onEditClick} />
      </div>
      <div className={classNames("text-right", balance?.status === "cache" && "animate-pulse")}>
        {balance && token && (
          <>
            <div>
              <Tokens
                amount={balance.transferable.tokens}
                decimals={token?.decimals}
                symbol={token?.symbol}
                noCountUp
                isBalance
              />
            </div>
            <div className="text-body-disabled">
              <Fiat amount={balance.transferable} noCountUp isBalance />
            </div>
          </>
        )}
      </div>
    </Container>
  )
}

const NetworkRow = () => {
  const [t] = useTranslation()

  const { networkId, networkName } = useNetworkDetails()

  return (
    <div className="flex w-full items-center justify-between">
      <div>{t("Network")}</div>
      <div className="flex items-center gap-2">
        <ChainLogo id={networkId} className="inline-block text-base" />
        <div>{networkName}</div>
      </div>
    </div>
  )
}

const EvmFeeSettingsRow = () => {
  const { t } = useTranslation("send-funds")
  const { token, evmNetwork, evmTransaction } = useSendFunds()

  if (!token || !evmTransaction || !evmNetwork || !isEvmToken(token)) return null

  const {
    tx,
    txDetails,
    priority,
    gasSettingsByPriority,
    setCustomSettings,
    setPriority,
    networkUsage,
  } = evmTransaction

  return (
    <div className="flex h-12 w-full items-center justify-between gap-4">
      <div>{t("Transaction Priority")}</div>
      <div>
        {evmNetwork?.nativeToken?.id && priority && tx && txDetails && (
          <EthFeeSelect
            tokenId={evmNetwork.nativeToken.id}
            drawerContainerId="main"
            gasSettingsByPriority={gasSettingsByPriority}
            setCustomSettings={setCustomSettings}
            onChange={setPriority}
            priority={priority}
            txDetails={txDetails}
            networkUsage={networkUsage}
            tx={tx}
          />
        )}
      </div>
    </div>
  )
}

const FeesSummary = () => {
  const { t } = useTranslation("send-funds")
  const { feeToken, estimatedFee, isLoading } = useSendFunds()

  return (
    <Container
      className={classNames("space-y-4 px-8 py-4", isLoading && !estimatedFee && "animate-pulse")}
    >
      <NetworkRow />
      <EvmFeeSettingsRow />
      <div className="flex w-full items-center justify-between gap-4 ">
        <div className="whitespace-nowrap">
          {t("Estimated Fee")} <SendFundsFeeTooltip />
        </div>
        <div
          className={classNames(
            "flex grow items-center justify-end gap-2 truncate",
            isLoading && estimatedFee && "animate-pulse"
          )}
        >
          {estimatedFee && feeToken && (
            <TokensAndFiat planck={estimatedFee.planck} tokenId={feeToken.id} />
          )}
        </div>
      </div>
    </Container>
  )
}

const ReviewButton = () => {
  const { t } = useTranslation("send-funds")
  const {
    gotoReview,
    drawers: { forfeitWarning },
  } = useSendFundsWizard()
  const { isValid, tokensToBeReaped } = useSendFunds()

  const handleClick = useCallback(() => {
    if (tokensToBeReaped?.length) forfeitWarning.open()
    else gotoReview(false)
  }, [tokensToBeReaped?.length, forfeitWarning, gotoReview])

  return (
    <>
      <Button
        type="submit"
        primary
        className="mt-8 w-full"
        disabled={!isValid}
        onClick={handleClick}
      >
        {t("Review")}
      </Button>
      <ForfeitWarningDrawer />
    </>
  )
}

const AddContact = () => {
  const { t } = useTranslation("send-funds")
  const { to } = useSendFunds()
  const {
    drawers: { addressBookContact },
  } = useSendFundsWizard()
  const account = useAccountByAddress(to)
  const { contacts } = useAddressBook()

  const canAdd = useMemo(() => {
    if (account || !to) return false
    const genericAddress = convertAddress(to, null)
    return !contacts?.find((c) => convertAddress(c.address, null) === genericAddress) ?? null
  }, [account, contacts, to])

  const addressType: AccountAddressType = useMemo(() => {
    if (!to) return "UNKNOWN"
    return isEthereumAddress(to) ? "ethereum" : "ss58"
  }, [to])

  if (!canAdd || !to) return null

  return (
    <>
      <PillButton
        onClick={addressBookContact.open}
        size={"base"}
        className="h-16 !rounded !px-4"
        icon={UserPlusIcon}
      >
        {t("Add")}
      </PillButton>
      <AddToAddressBookDrawer
        address={to}
        addressType={addressType}
        asChild={false}
        containerId="main"
      />
    </>
  )
}

export const SendFundsAmountForm = () => {
  const { t } = useTranslation("send-funds")
  const { from, to, goto, tokenId } = useSendFundsWizard()
  const genesisHash = useGenesisHashFromTokenId(tokenId)

  const handleGotoClick = useCallback(
    (page: SendFundsWizardPage) => () => {
      goto(page)
    },
    [goto]
  )

  // we use a form for enter keypress to trigger submit button, but we don't want form to be actually submitted
  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full w-full flex-col overflow-hidden px-12 pb-8"
    >
      <Container className="flex h-[9rem] w-full flex-col justify-center gap-5 px-8">
        <div className="flex w-full items-center justify-between gap-4">
          <div>{t("From")}</div>
          <div>
            <AddressPillButton
              className="!max-w-[260px]"
              address={from}
              genesisHash={genesisHash}
              onClick={handleGotoClick("from")}
            />
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          <div>{t("To")}</div>
          <div className="flex items-center gap-4">
            <AddressPillButton
              className="!max-w-[260px]"
              address={to}
              genesisHash={genesisHash}
              onClick={handleGotoClick("to")}
            />
            <AddContact />
          </div>
        </div>
      </Container>
      <AmountEdit />
      <div className="w-full space-y-4 text-xs leading-[140%]">
        <TokenRow onEditClick={handleGotoClick("token")} />
        <FeesSummary />
      </div>
      <ReviewButton />
    </form>
  )
}
