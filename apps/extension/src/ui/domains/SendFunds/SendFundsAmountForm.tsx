import { log } from "@core/log"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { Drawer } from "@talisman/components/Drawer"
import { WithTooltip } from "@talisman/components/Tooltip"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { IconAlert, InfoIcon, SwapIcon, UserPlusIcon } from "@talisman/theme/icons"
import { convertAddress } from "@talisman/util/convertAddress"
import { AccountAddressType } from "@talisman/util/getAddressType"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { classNames, planckToTokens, tokensToPlanck } from "@talismn/util"
import { SendFundsWizardPage, useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import useToken from "@ui/hooks/useToken"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"
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
  useState,
} from "react"
import { Container } from "react-dom"
import { Button, PillButton } from "talisman-ui"

import AccountAvatar from "../Account/Avatar"
import { ChainLogo } from "../Asset/ChainLogo"
import Fiat from "../Asset/Fiat"
import { AddToAddressBookDrawer } from "../Asset/Send/AddToAddressBookDrawer"
import { TokenLogo } from "../Asset/TokenLogo"
import Tokens from "../Asset/Tokens"
import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { EthFeeSelect } from "../Ethereum/GasSettings/EthFeeSelect"
import { SendFundsFeeTooltip } from "./SendFundsFeeTooltip"
import { useSendFunds } from "./useSendFunds"

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

type AddressPillButtonProps = { address?: string | null; className?: string; onClick?: () => void }

const AddressPillButton: FC<AddressPillButtonProps> = ({ address, className, onClick }) => {
  const account = useAccountByAddress(address as string)
  const contact = useContact(address)

  const { name, genesisHash } = useMemo(() => {
    if (account) return account
    if (contact) return { name: contact.name, genesisHash: undefined }
    return { name: undefined, genesisHash: undefined }
  }, [account, contact])

  if (!address) return null

  return (
    <PillButton className={classNames("h-16 max-w-full !px-4", className)} onClick={onClick}>
      <div className="text-body flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base">
        <div>
          <AccountAvatar className="!text-lg" address={address} genesisHash={genesisHash} />
        </div>
        <div className="leading-base grow overflow-hidden text-ellipsis whitespace-nowrap">
          {name ?? shortenAddress(address, 6, 6)}
        </div>
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

  useEffect(() => {
    resizeTokensInput()
  }, [resizeTokensInput])

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
        defaultValue={defaultValue}
        placeholder={`0 ${token?.symbol}`}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={!sendMax && !transfer}
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

  const defaultValue = useMemo(
    () =>
      normalizeStringNumber(
        sendMax && maxAmount ? maxAmount.fiat("usd") : transfer?.fiat("usd"),
        2
      ),
    [maxAmount, sendMax, transfer]
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    debounce((e) => {
      if (sendMax) set("sendMax", false)

      const text = e.target.value ?? ""
      const num = Number(text)

      if (token && tokenRates?.usd && text.length && !isNaN(num)) {
        const fiat = parseFloat(text)
        const tokens = (fiat / tokenRates.usd).toFixed(Math.ceil(token.decimals / 3))
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
        $
      </div>
    </div>
  )
}

const DisplayContainer: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="text-body-secondary max-w-[264px] overflow-hidden text-ellipsis whitespace-nowrap text-sm">
      {children}
    </div>
  )
}

const FiatDisplay = () => {
  const { tokenRates, transfer, maxAmount, sendMax } = useSendFunds()

  const value = sendMax ? maxAmount : transfer

  if (!tokenRates || !value) return null

  return (
    <DisplayContainer>
      <Fiat amount={value.fiat("usd") ?? 0} noCountUp />
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
      <IconAlert className="inline-block align-text-top text-sm" /> {error}
    </WithTooltip>
  ) : null
}

const AmountEdit = () => {
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
              Max
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
              <Fiat amount={balance.transferable.fiat("usd")} noCountUp isBalance />
            </div>
          </>
        )}
      </div>
    </Container>
  )
}

const NetworkRow = () => {
  const { chain, evmNetwork } = useSendFunds()

  const { networkId, networkName } = useMemo(
    () => ({
      networkId: (chain ?? evmNetwork)?.id,
      networkName:
        chain?.name ??
        (evmNetwork ? `${evmNetwork?.name}${evmNetwork?.substrateChain ? " (Ethereum)" : ""}` : ""),
    }),
    [chain, evmNetwork]
  )

  return (
    <div className="flex w-full items-center justify-between">
      <div>Network</div>
      <div className="flex items-center gap-2">
        <ChainLogo id={networkId} className="inline-block text-base" />
        <div>{networkName}</div>
      </div>
    </div>
  )
}

const EvmFeeSettingsRow = () => {
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
      <div>Transaction Priority</div>
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
  const { feeToken, estimatedFee, isLoading } = useSendFunds()

  return (
    <Container
      className={classNames("space-y-4 px-8 py-4", isLoading && !estimatedFee && "animate-pulse")}
    >
      <NetworkRow />
      <EvmFeeSettingsRow />
      <div className="flex w-full items-center justify-between gap-4 ">
        <div className="whitespace-nowrap">
          Estimated Fee <SendFundsFeeTooltip />
        </div>
        <div
          className={classNames(
            "flex grow items-center justify-end gap-2 overflow-hidden text-ellipsis whitespace-nowrap",
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

type ForfeitDetailsProps = {
  tokenId: string
  planck: string
}
const ForfeitDetails: FC<ForfeitDetailsProps> = ({ tokenId, planck }) => {
  const token = useToken(tokenId)

  if (!isSubToken(token)) return null

  return (
    <>
      This transaction will cause{" "}
      <Tokens
        amount={planckToTokens(planck, token.decimals)}
        decimals={token.decimals}
        symbol={token.symbol}
        noCountUp
      />{" "}
      to be lost. If your balance falls below the minimum of{" "}
      <Tokens
        amount={planckToTokens(token.existentialDeposit, token.decimals)}
        decimals={token.decimals}
        symbol={token.symbol}
        noCountUp
      />
      , any remaining tokens will be forfeited.
    </>
  )
}

const ReviewButton = () => {
  const { gotoReview } = useSendFundsWizard()
  const { isValid, tokensToBeReaped } = useSendFunds()
  const { open, close, isOpen } = useOpenClose()

  const handleClick = useCallback(() => {
    if (tokensToBeReaped?.length) open()
    else gotoReview(false)
  }, [gotoReview, open, tokensToBeReaped])

  const handleConfirmReap = useCallback(() => {
    gotoReview(true)
  }, [gotoReview])

  return (
    <>
      <Button
        type="submit"
        primary
        className="mt-8 w-full"
        disabled={!isValid}
        onClick={handleClick}
      >
        Review
      </Button>
      <Drawer
        anchor="bottom"
        open={isOpen}
        onClose={close}
        parent={document.getElementById("main")}
      >
        <div className="bg-black-tertiary rounded-t-xl p-12 text-center">
          <div>
            <InfoIcon className="text-primary-500 inline-block text-3xl" />
          </div>
          <div className="mt-10 font-bold">Confirm forfeit</div>
          <div className="text-body-secondary mt-5 text-sm">
            {tokensToBeReaped?.map(({ token, amount }) => (
              <ForfeitDetails key={token.id} tokenId={token.id} planck={amount.planck.toString()} />
            ))}
            <div className="mt-5">
              <a
                className="text-white underline"
                target="_blank"
                href="https://support.polkadot.network/support/solutions/articles/65000168651-what-is-the-existential-deposit-"
              >
                Learn more
              </a>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4">
            <Button onClick={close}>Cancel</Button>
            <Button primary onClick={handleConfirmReap}>
              Proceed
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  )
}

const AddContact = () => {
  const { to } = useSendFunds()
  const account = useAccountByAddress(to)
  const { contacts } = useAddressBook()
  const { open, close, isOpen } = useOpenClose()

  const canAdd = useMemo(() => {
    if (account || !to) return false
    const genericAddress = convertAddress(to, null)
    return !contacts?.find((c) => convertAddress(c.address, null) === genericAddress) ?? null
  }, [account, contacts, to])

  const addressType: AccountAddressType = useMemo(() => {
    if (!to) return "UNKNOWN"
    return isEthereumAddress(to) ? "ethereum" : "ss58"
  }, [to])

  const drawerContainer = document.getElementById("main")

  if (!canAdd || !to) return null

  return (
    <>
      <PillButton onClick={open} size={"base"} className="h-16 !rounded !px-4" icon={UserPlusIcon}>
        Add
      </PillButton>
      <AddToAddressBookDrawer
        isOpen={isOpen}
        close={close}
        address={to}
        addressType={addressType}
        asChild={false}
        parent={drawerContainer}
      />
    </>
  )
}

export const SendFundsAmountForm = () => {
  const { from, to, goto } = useSendFundsWizard()

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
          <div>From</div>
          <div>
            <AddressPillButton
              className="max-w-[260px]"
              address={from}
              onClick={handleGotoClick("from")}
            />
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          <div>To</div>
          <div className="flex items-center gap-4">
            <AddressPillButton
              className="max-w-[260px]"
              address={to}
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
