import { LoaderIcon, SwapIcon, XIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { BalanceFormatter } from "@talismn/balances"
import { planckToTokens, tokensToPlanck } from "@talismn/util"
import { SendFundsWizardPage, useSendFunds } from "@ui/apps/popup/pages/SendFunds/context"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { useInputNumberOnly } from "@ui/hooks/useInputNumberOnly"
import { useInputAutoSize } from "@ui/hooks/useTextWidth"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import BigNumber from "bignumber.js"
import { remove } from "lodash"
import {
  CSSProperties,
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
import { Button, PillButton, classNames } from "talisman-ui"

import AccountAvatar from "../Account/Avatar"
import { ChainLogo } from "../Asset/ChainLogo"
import Fiat from "../Asset/Fiat"
import { TokenLogo } from "../Asset/TokenLogo"
import Tokens from "../Asset/Tokens"
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
    <PillButton className={classNames("h-16 max-w-full !py-2 !px-4", className)} onClick={onClick}>
      <div className="text-body flex max-w-full flex-nowrap items-center gap-4 overflow-hidden text-base">
        <div>
          <AccountAvatar className="!text-lg" address={address} genesisHash={genesisHash} />
        </div>
        <div className="grow overflow-hidden text-ellipsis whitespace-nowrap">
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
  const { set, remove } = useSendFunds()
  const { token, sendAmount } = useSendFundsDetails()

  const placeholder = useMemo(() => `0${token ? ` ${token.symbol}` : ""}`, [token])

  const [text, setText] = useState<string>("")

  //can't measure text from an input[type=number] so we use a input[type=text] and restrict input to numbers
  const refInput = useRef<HTMLInputElement>(null)
  useInputNumberOnly(refInput)
  useInputAutoSize(refInput)

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
  const { set, remove } = useSendFunds()
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

  // console.log(text)

  // const refInput = useRef<HTMLInputElement>(null)
  // //can't measure text from an input[type=number] so we use a input[type=text] and restrict input to numbers
  // useInputNumberOnly(refInput)

  // const width = useTextWidth(text?.length ? text : FIAT_PLACEHOLDER, refInput)

  // const inputStyle: CSSProperties = useMemo(() => ({ width }), [width])

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
        // style={inputStyle}
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

const AmountEdit = () => {
  const [isTokenEdit, setIsTokenEdit] = useState(true)
  const { tokenRates } = useSendFundsDetails()

  const toggleIsTokenEdit = useCallback(() => {
    setIsTokenEdit((prev) => !prev)
  }, [])

  return (
    <div className="w-full grow">
      <div className="flex h-[13.1rem] flex-col justify-end text-xl font-bold">
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
    </div>
  )
}

const TokenRow = ({ onEditClick }: { onEditClick: () => void }) => {
  const { tokenId } = useSendFunds()
  const { balance, token } = useSendFundsDetails()

  const { total, isLoading } = useMemo(
    () => ({
      total: balance.sorted
        .reduce((prev, curr) => prev.plus(BigNumber(curr.transferable.tokens)), BigNumber("0"))
        .toString(),
      isLoading: balance.sorted.find((b) => b.status === "cache"),
    }),
    [balance]
  )

  return (
    <Container className="flex w-full justify-between px-6 py-4">
      <div>
        <TokenPillButton tokenId={tokenId} onClick={onEditClick} />
      </div>
      <div className="text-right ">
        <div>
          {isLoading && <LoaderIcon className="animate-spin-slow mr-2 inline" />}
          <Tokens
            amount={total}
            decimals={token?.decimals}
            symbol={token?.symbol}
            noCountUp
            isBalance
          />
        </div>
        <div className="text-body-disabled">
          <Fiat amount={balance.sum.fiat("usd").transferable} noCountUp isBalance />
        </div>
      </div>
    </Container>
  )
}

const NetworkRow = () => {
  const { chain, evmNetwork } = useSendFundsDetails()

  const chainName = useMemo(
    () =>
      chain?.name ??
      (evmNetwork ? `${evmNetwork?.name}${evmNetwork?.substrateChain ? " (Ethereum)" : ""}` : ""),
    [chain?.name, evmNetwork]
  )

  return (
    <Container className="flex w-full justify-between px-8 py-4 leading-none">
      <div>Network</div>
      <div className="flex items-center gap-2">
        <ChainLogo id={chain?.id ?? evmNetwork?.id} className="inline-block text-base" />
        <div>{chainName}</div>
      </div>
    </Container>
  )
}

const EstimatedFeeRow = () => {
  return (
    <Container className="flex w-full justify-between px-8 py-4">
      <div>Estimated Fee</div>
      <div>&gt;0.001 DOT</div>
    </Container>
  )
}

export const SendFundsMainForm = () => {
  const { from, to, goto } = useSendFunds()

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
            <div className="overflow-hidden">
              <AddressPillButton address={from} onClick={handleGotoClick("from")} />
            </div>
          </div>
          <div className="flex w-full justify-between gap-4">
            <div>To</div>
            <div className="overflow-hidden">
              <AddressPillButton address={to} onClick={handleGotoClick("to")} />
            </div>
          </div>
        </Container>
        <AmountEdit />
        <div className="w-full space-y-4 text-xs leading-[140%]">
          <TokenRow onEditClick={handleGotoClick("token")} />
          <NetworkRow />
          <EstimatedFeeRow />
        </div>
        <Button primary className="mt-8 w-full" disabled>
          Review
        </Button>
      </div>
    </SendFundsDetailsProvider>
  )
}
