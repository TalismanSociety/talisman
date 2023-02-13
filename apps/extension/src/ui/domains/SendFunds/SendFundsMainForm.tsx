import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { IconAlert, InfoIcon, LoaderIcon, SwapIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { classNames, tokensToPlanck } from "@talismn/util"
import { SendFundsWizardPage, useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { useInputNumberOnly } from "@ui/hooks/useInputNumberOnly"
import { useInputAutoSize } from "@ui/hooks/useTextWidth"
import useToken from "@ui/hooks/useToken"
import { isSubToken } from "@ui/util/isSubToken"
import {
  ChangeEventHandler,
  DetailedHTMLProps,
  FC,
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
import { TokenLogo } from "../Asset/TokenLogo"
import Tokens from "../Asset/Tokens"
import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { SendFundsDetailsProvider, useSendFundsDetails } from "./useSendFundsDetails"

type ContainerProps = DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>

const Container: FC<ContainerProps> = (props) => {
  return (
    <div
      {...props}
      className={classNames("bg-grey-900 text-body-secondary rounded", props.className)}
    ></div>
  )
}

type AddressPillButtonProps = { address?: string | null; className?: string; onClick?: () => void }

const AddressPillButton: FC<AddressPillButtonProps> = ({ address, className, onClick }) => {
  const account = useAccountByAddress(address as string)

  // TODO lookup contacts

  const { name, genesisHash } = useMemo(
    () => account ?? { name: undefined, genesisHash: undefined },
    [account]
  )

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
  const { set, remove } = useSendFundsWizard()
  const { token, sendAmount } = useSendFundsDetails()

  const placeholder = useMemo(() => `0${token ? ` ${token.symbol}` : ""}`, [token])

  const [text, setText] = useState<string>("")

  //can't measure text from an input[type=number] so we use a input[type=text] and restrict input to numbers
  const refInput = useRef<HTMLInputElement>(null)
  useInputNumberOnly(refInput)
  useInputAutoSize(refInput)

  // init from query string
  const refInitialized = useRef(false)
  useEffect(() => {
    if (!refInitialized.current && sendAmount?.tokens) {
      refInitialized.current = true
      setText(sendAmount?.tokens)
    }
  }, [sendAmount?.tokens])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (token && !isNaN(parseFloat(e.target.value)))
        set("amount", tokensToPlanck(e.target.value, token.decimals))

      if (!e.target.value.length) remove("amount")

      setText(e.target.value || "")
    },
    [remove, set, token]
  )

  return (
    <div className="text-center">
      <input
        ref={refInput}
        type="text"
        value={text}
        placeholder={placeholder}
        autoFocus
        className="text-body inline-block min-w-0 max-w-[32rem] bg-transparent text-center text-xl"
        onChange={handleChange}
      />
      {text ? ` ${token?.symbol}` : ""}
    </div>
  )
}

const FIAT_PLACEHOLDER = "$0.00"

const FiatInput = () => {
  const { set, remove } = useSendFundsWizard()
  const { token, sendAmount, tokenRates } = useSendFundsDetails()

  const [text, setText] = useState<string>("")

  //can't measure text from an input[type=number] so we use a input[type=text] and restrict input to numbers
  const refInput = useRef<HTMLInputElement>(null)
  useInputNumberOnly(refInput)
  useInputAutoSize(refInput)

  const refInitialized = useRef(false)
  useEffect(() => {
    if (!refInitialized.current && sendAmount?.tokens) {
      refInitialized.current = true
      if (!text) setText(sendAmount?.fiat("usd")?.toFixed(2) ?? "")
    }
  }, [sendAmount, text])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
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
    [remove, set, token, tokenRates]
  )

  if (!tokenRates) return null

  return (
    <div className="text-center">
      {text?.length ? "$" : ""}
      <input
        ref={refInput}
        type="text"
        value={text}
        autoFocus
        placeholder={FIAT_PLACEHOLDER}
        data-symbol={token?.symbol ?? ""}
        className={classNames(
          "text-body inline-block min-w-0 max-w-[32rem] bg-transparent text-center text-xl"
        )}
        onChange={handleChange}
      />
    </div>
  )
}

const FiatDisplay = () => {
  const { tokenRates, sendAmount } = useSendFundsDetails()

  if (!tokenRates) return null

  return <Fiat amount={sendAmount?.fiat("usd") ?? 0} noCountUp />
}

const TokenDisplay = () => {
  const { token, sendAmount } = useSendFundsDetails()

  if (!token) return null

  return (
    <Tokens
      amount={sendAmount?.tokens ?? "0"}
      decimals={token.decimals}
      symbol={token.symbol}
      noCountUp
    />
  )
}

const ErrorMessage = () => {
  const { error } = useSendFundsDetails()

  return error ? (
    <div className="inline-flex items-center gap-2">
      <IconAlert />
      <span>{error}</span>
    </div>
  ) : null
}

const AmountEdit = () => {
  const [isTokenEdit, setIsTokenEdit] = useState(true)
  const { tokenRates } = useSendFundsDetails()

  const toggleIsTokenEdit = useCallback(() => {
    setIsTokenEdit((prev) => !prev)
  }, [])

  return (
    <div className="w-full grow">
      <div className="flex h-[12rem] flex-col justify-end text-xl font-bold">
        {isTokenEdit ? <TokenInput /> : <FiatInput />}
      </div>
      <div className="mt-4 flex justify-center gap-6">
        <div className="text-body-secondary text-sm">
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
        <PillButton size="xs" className="h-[2.2rem] rounded-sm py-0 px-4">
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
  const { balance, token } = useSendFundsDetails()

  return (
    <Container className="flex h-[50px] w-full justify-between px-6 py-4">
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
  const { chain, evmNetwork } = useSendFundsDetails()

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
    <Container className="flex w-full justify-between px-8 py-4 leading-none">
      <div>Network</div>
      <div className="flex items-center gap-2">
        <ChainLogo id={networkId} className="inline-block text-base" />
        <div>{networkName}</div>
      </div>
    </Container>
  )
}

const EstimatedFeeRow = () => {
  const { feeToken, estimatedFee, isEstimatingFee } = useSendFundsDetails()

  return (
    <Container className="flex w-full items-center justify-between gap-4 px-8 py-4">
      <div className="whitespace-nowrap">Estimated Fee</div>
      <div className="flex grow items-center justify-end gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
        {isEstimatingFee && <LoaderIcon className="animate-spin-slow align-text-top" />}
        {estimatedFee && feeToken && <TokensAndFiat planck={estimatedFee} tokenId={feeToken.id} />}
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
  const { isValid, tokensToBeReaped, token } = useSendFundsDetails()
  const { open, close, isOpen } = useOpenClose()

  const handleClick = useCallback(() => {
    if (Object.keys(tokensToBeReaped).length) open()
    else gotoReview(false)
  }, [gotoReview, open, tokensToBeReaped])

  const handleConfirmReap = useCallback(() => {
    gotoReview(true)
  }, [gotoReview])

  return (
    <>
      <Button primary className="mt-8 w-full" disabled={!isValid} onClick={handleClick}>
        Review
      </Button>
      <Drawer anchor="bottom" open={isOpen} onClose={close}>
        <div className="bg-black-tertiary rounded-t-xl p-12 text-center">
          <div>
            <InfoIcon className="text-primary-500 inline-block text-3xl" />
          </div>
          <div className="mt-10 font-bold">Confirm forfeit</div>
          <div className="text-body-secondary mt-5 text-sm">
            {Object.entries(tokensToBeReaped).map(([tokenId, planck]) => (
              <ForfeitDetails key={tokenId} tokenId={tokenId} planck={planck.toString()} />
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

export const SendFundsMainForm = () => {
  const { from, to, goto } = useSendFundsWizard()

  const handleGotoClick = useCallback(
    (page: SendFundsWizardPage) => () => {
      goto(page)
    },
    [goto]
  )

  return (
    <SendFundsDetailsProvider>
      <div className="flex h-full w-full flex-col overflow-hidden px-12 pb-8">
        <Container className="flex h-[9rem] w-full flex-col justify-center gap-5 px-8">
          <div className="flex w-full justify-between gap-4">
            <div>From</div>
            <div>
              <AddressPillButton
                className="max-w-[260px]"
                address={from}
                onClick={handleGotoClick("from")}
              />
            </div>
          </div>
          <div className="flex w-full justify-between gap-4">
            <div>To</div>
            <div>
              <AddressPillButton
                className="max-w-[260px]"
                address={to}
                onClick={handleGotoClick("to")}
              />
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
      </div>
    </SendFundsDetailsProvider>
  )
}
