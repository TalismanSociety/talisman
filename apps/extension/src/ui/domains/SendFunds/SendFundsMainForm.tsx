import { isEthereumAddress } from "@polkadot/util-crypto"
import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { IconAlert, InfoIcon, LoaderIcon, SwapIcon, UserPlusIcon } from "@talisman/theme/icons"
import { convertAddress } from "@talisman/util/convertAddress"
import { AccountAddressType } from "@talisman/util/getAddressType"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { classNames, formatDecimals, planckToTokens, tokensToPlanck } from "@talismn/util"
import { SendFundsWizardPage, useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useInputNumberOnly } from "@ui/hooks/useInputNumberOnly"
import { useInputAutoSize } from "@ui/hooks/useTextWidth"
import useToken from "@ui/hooks/useToken"
import { isSubToken } from "@ui/util/isSubToken"
import {
  ChangeEventHandler,
  DetailedHTMLProps,
  FC,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import { useSendFunds } from "./useSendFunds"

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
    <PillButton className={classNames("h-16 !py-2 !px-4", className)} onClick={onClick}>
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
  const { set, remove, sendMax, amount } = useSendFundsWizard()
  const { token, transfer, maxAmount, isEstimatingMaxAmount } = useSendFunds()

  const placeholder = useMemo(() => {
    if (token && sendMax && maxAmount) return `${formatDecimals(maxAmount.tokens)} ${token.symbol}`
    return token ? `0 ${token.symbol}` : "0"
  }, [maxAmount, sendMax, token])

  const [text, setText] = useState<string>("")

  //can't measure text from an input[type=number] so we use a input[type=text] and restrict input to numbers
  const refInput = useRef<HTMLInputElement>(null)
  useInputNumberOnly(refInput)
  useInputAutoSize(refInput)

  // init from query string
  const refInitialized = useRef(false)
  useEffect(() => {
    if (!refInitialized.current && transfer?.tokens) {
      refInitialized.current = true
      if (!sendMax) setText(transfer?.tokens)
    }
  }, [sendMax, transfer?.tokens])

  useEffect(() => {
    if (!refInput.current) return
    setText(sendMax || !amount || !token ? "" : planckToTokens(amount, token.decimals))
  }, [amount, sendMax, token])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (sendMax) set("sendMax", false)

      if (token && !isNaN(parseFloat(e.target.value)))
        set("amount", tokensToPlanck(e.target.value, token.decimals))

      if (!e.target.value.length) remove("amount")

      setText(e.target.value || "")
    },
    [remove, sendMax, set, token]
  )

  return (
    <div className="flex w-full max-w-[400px] flex-nowrap justify-center gap-4">
      <input
        ref={refInput}
        type="text"
        value={sendMax ? "" : text}
        placeholder={placeholder}
        autoFocus={!sendMax}
        className={classNames(
          "text-body inline-block min-w-0  bg-transparent text-center text-xl",
          sendMax && "placeholder:text-white",
          isEstimatingMaxAmount && "hidden" // hide until value is known
        )}
        onChange={handleChange}
      />
      <span className="shrink-0">{text && !sendMax ? ` ${token?.symbol}` : ""}</span>
      {isEstimatingMaxAmount && (
        <div className="text-body-disabled mb-4 flex items-center justify-center gap-2 text-base font-light">
          <LoaderIcon className="text-md inline-block animate-spin" />
          <div>Estimating max amount...</div>
        </div>
      )}
    </div>
  )
}

const FIAT_PLACEHOLDER = "$0.00"

const FiatInput = () => {
  const { set, remove, sendMax } = useSendFundsWizard()
  const { token, transfer, maxAmount, tokenRates, isEstimatingMaxAmount } = useSendFunds()

  const placeholder = useMemo(() => {
    if (token && sendMax && maxAmount) return `$${maxAmount?.fiat("usd")?.toFixed(2)}`
    return FIAT_PLACEHOLDER
  }, [maxAmount, sendMax, token])

  const [text, setText] = useState<string>("")

  //can't measure text from an input[type=number] so we use a input[type=text] and restrict input to numbers
  const refInput = useRef<HTMLInputElement>(null)
  useInputNumberOnly(refInput)
  useInputAutoSize(refInput)

  const refInitialized = useRef(false)
  useEffect(() => {
    if (!refInitialized.current && transfer?.tokens) {
      refInitialized.current = true
      if (!sendMax) setText(transfer?.fiat("usd")?.toFixed(2) ?? "")
    }
  }, [sendMax, text, transfer])

  useEffect(() => {
    if (sendMax && refInput.current) {
      setText("")
    }
  }, [sendMax])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (sendMax) set("sendMax", false)

      // TODO exclude 0s
      if (!!tokenRates && tokenRates.usd !== null && token && !isNaN(parseFloat(e.target.value))) {
        const fiat = parseFloat(e.target.value)
        const tokens = (fiat / tokenRates.usd).toFixed(Math.ceil(token.decimals / 3))
        set("amount", tokensToPlanck(tokens, token.decimals))
      }
      if (!e.target.value.length) {
        remove("amount")
      }
      setText(e.target.value)
    },
    [remove, sendMax, set, token, tokenRates]
  )

  if (!tokenRates) return null

  return (
    <div className="text-center">
      {text?.length ? "$" : ""}
      <input
        ref={refInput}
        type="text"
        value={sendMax ? "" : text}
        autoFocus
        placeholder={placeholder}
        className={classNames(
          "text-body inline-block min-w-0 max-w-[32rem] bg-transparent text-center text-xl",
          isEstimatingMaxAmount && "hidden" // hide until value is known
        )}
        onChange={handleChange}
      />
      {isEstimatingMaxAmount && (
        <div className="text-body-disabled mb-4 flex items-center justify-center gap-2 text-base font-light">
          <LoaderIcon className="text-md inline-block animate-spin" />
          <div>Estimating max amount...</div>
        </div>
      )}
    </div>
  )
}

const FiatDisplay = () => {
  const { tokenRates, transfer, maxAmount, sendMax } = useSendFunds()

  const value = sendMax ? maxAmount : transfer

  if (!tokenRates || !value) return null

  return <Fiat amount={value.fiat("usd") ?? 0} noCountUp />
}

const TokenDisplay = () => {
  const { token, transfer, maxAmount, sendMax } = useSendFunds()

  const value = sendMax ? maxAmount : transfer

  if (!token || !value) return null

  return (
    <Tokens
      amount={value.tokens ?? "0"}
      decimals={token.decimals}
      symbol={token.symbol}
      noCountUp
    />
  )
}

const ErrorMessage = () => {
  const { error } = useSendFunds()

  return error ? (
    <span>
      <IconAlert className="inline-block align-text-top text-sm" /> {error}
    </span>
  ) : null
}

const AmountEdit = () => {
  const { sendMax, set } = useSendFundsWizard()
  const [isTokenEdit, setIsTokenEdit] = useState(true)
  const { onSendMaxClick, tokenRates, isEstimatingMaxAmount } = useSendFunds()
  // const { tokenRates, token } = useSendFundsConfirm()

  const toggleIsTokenEdit = useCallback(() => {
    setIsTokenEdit((prev) => !prev)
  }, [])

  // const toggleSendMax = useCallback(() => {
  //   if(token.type === "substrate-native")
  //   set("sendMax", !sendMax)
  // }, [sendMax, set])

  return (
    <div className="w-full grow">
      <div className="flex h-[12rem] flex-col justify-end text-xl font-bold">
        {isTokenEdit ? <TokenInput /> : <FiatInput />}
      </div>
      <div
        className={classNames(
          "mt-4 flex max-w-full items-center justify-center gap-6",
          isEstimatingMaxAmount && "invisible"
        )}
      >
        <div className="text-body-secondary max-w-[264px] overflow-hidden text-ellipsis whitespace-nowrap text-sm">
          {!isTokenEdit ? <TokenDisplay /> : <FiatDisplay />}
        </div>
        {tokenRates && (
          <PillButton
            onClick={toggleIsTokenEdit}
            size="xs"
            className="h-[2.2rem] w-[2.2rem] rounded-full px-0 py-0"
          >
            <SwapIcon />
          </PillButton>
        )}
        <PillButton
          onClick={onSendMaxClick}
          size="xs"
          className={classNames("h-[2.2rem] rounded-sm py-0 px-4", sendMax && "bg-grey-700")}
        >
          Max
        </PillButton>
      </div>
      <div className="text-brand-orange mt-4 text-center text-xs">
        <ErrorMessage />
      </div>
    </div>
  )
}

const TokenRow = ({ onEditClick }: { onEditClick: () => void }) => {
  const { tokenId } = useSendFundsWizard()
  const { balance, token } = useSendFunds()

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
    <Container className="flex w-full items-center justify-between px-8 py-4 leading-none">
      <div>Network</div>
      <div className="flex items-center gap-2">
        <ChainLogo id={networkId} className="inline-block text-base" />
        <div>{networkName}</div>
      </div>
    </Container>
  )
}

const EstimatedFeeRow = () => {
  const { feeToken, estimatedFee, isLoading } = useSendFunds()

  return (
    <Container className="flex w-full items-center justify-between gap-4 px-8 py-4">
      <div className="whitespace-nowrap">Estimated Fee</div>
      <div
        className={classNames(
          "flex grow items-center justify-end gap-2 overflow-hidden text-ellipsis whitespace-nowrap",
          isLoading && estimatedFee && "animate-pulse"
        )}
      >
        {isLoading && !estimatedFee && <LoaderIcon className="animate-spin-slow align-text-top" />}
        {estimatedFee && feeToken && (
          <TokensAndFiat planck={estimatedFee.planck} tokenId={feeToken.id} />
        )}
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
      This transaction will cause <TokensAndFiat planck={planck} tokenId={tokenId} noCountUp /> to
      be lost. If your balance falls below the minimum of{" "}
      <TokensAndFiat planck={token.existentialDeposit} tokenId={tokenId} noCountUp />, any remaining
      tokens will be forfeit.
    </>
  )
}

const ReviewButton = () => {
  const { gotoReview, tokenId, set } = useSendFundsWizard()
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
        parent={document.getElementById("send-funds-main")}
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
            <Button autoFocus onClick={close}>
              Cancel
            </Button>
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

  const drawerContainer = document.getElementById("send-funds-main")

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

export const SendFundsMainForm = () => {
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
        <NetworkRow />
        <EstimatedFeeRow />
      </div>
      <ReviewButton />
    </form>
  )
}
