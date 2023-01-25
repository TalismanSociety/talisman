import { notify } from "@talisman/components/Notifications"
import { BalanceFormatter } from "@talismn/balances"
import { useSendFunds } from "@ui/apps/popup/pages/SendFunds/context"
import useChain from "@ui/hooks/useChain"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "talisman-ui"

import { ChainLogo } from "../Asset/ChainLogo"
import { TokenLogo } from "../Asset/TokenLogo"
import Tokens from "../Asset/Tokens"
import { SendFundsAddressPillButton } from "./SendFundsAddressPillButton"

const TokenDisplay = () => {
  const { tokenId, amount } = useSendFunds()
  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)

  const sendAmount = useMemo(() => {
    return amount && token ? new BalanceFormatter(amount, token.decimals, tokenRates) : undefined
  }, [amount, token, tokenRates])

  if (!sendAmount || !token) return null

  return (
    <div className="inline-flex h-12 items-center gap-4">
      <TokenLogo tokenId={token.id} className="inline-block text-lg" />
      <Tokens
        amount={sendAmount.tokens}
        decimals={token.decimals}
        symbol={token.symbol}
        noCountUp
      />
    </div>
  )
}

const SendButton = () => {
  // controls enabling the button 1 second after the form shows up, to prevent sending funds accidentaly by double clicking the review button on previous screen
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setReady(true)
    }, 1_000)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  return (
    <Button className="w-full" primary disabled={!ready}>
      Confirm
    </Button>
  )
}

const AddressDisplay: FC<{ address: string | null }> = ({ address }) => {
  const handleClick = useCallback(async () => {
    if (!address) return
    const toastId = "copy"
    try {
      // TODO convert to chain format
      await navigator.clipboard.writeText(address)
      notify(
        {
          type: "success",
          title: "Copy successful",
          subtitle: "address copied to clipboard",
        },
        // set an id to prevent multiple clicks to display multiple notifications
        { toastId }
      )
      return true
    } catch (err) {
      notify(
        {
          type: "error",
          title: `Copy failed`,
          subtitle: (err as Error).message,
        },
        { toastId }
      )
      return false
    }
  }, [address])

  return <SendFundsAddressPillButton address={address} onClick={handleClick} />
}

const NetworkDisplay = () => {
  const { tokenId } = useSendFunds()
  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)
  const evmNetwork = useChain(token?.evmNetwork?.id)

  const { networkId, networkName } = useMemo(
    () => ({ networkId: (chain ?? evmNetwork)?.id, networkName: (chain ?? evmNetwork)?.name }),
    [chain, evmNetwork]
  )

  if (!token) return null

  return (
    <span className="inline-flex items-center gap-4">
      <ChainLogo id={networkId} className="inline text-lg" />
      <span>{networkName}</span>
    </span>
  )
}

export const SendFundsConfirmForm = () => {
  const { from, to } = useSendFunds()

  return (
    <div className="flex h-full w-full flex-col px-12 py-8">
      <div className="text-lg font-bold">You are sending</div>
      <div className="mt-24 w-full grow">
        <div className="bg-grey-900 text-body-secondary rounded px-6 py-4 leading-none">
          <div className="mb-2 flex h-12 items-center justify-between px-2">
            <div className="text-body-secondary">Amount</div>
            <div className="text-body h-12 overflow-hidden">
              <TokenDisplay />
            </div>
          </div>
          <div className="mt-3 flex h-[3.6rem] w-full items-center justify-between gap-8 overflow-hidden py-1 pl-1">
            <div className="text-body-secondary">From</div>
            <div className="text-body overflow-hidden">
              <div className="p-1">
                <AddressDisplay address={from} />
              </div>
            </div>
          </div>
          <div className="mt-3 flex h-[3.6rem] w-full items-center justify-between gap-8 overflow-hidden py-1 pl-1">
            <div className="text-body-secondary">To</div>
            <div className="text-body overflow-hidden">
              <div className="p-1">
                <AddressDisplay address={to} />
              </div>
            </div>
          </div>
          <div className="mt-3 flex h-12 items-center justify-between px-2">
            <div className="text-body-secondary">Network</div>
            <div className="text-body  h-12 overflow-hidden">
              <NetworkDisplay />
            </div>
          </div>
          <div className="py-12">
            <hr />
          </div>
          <div className="flex justify-between text-xs">
            <div className="text-body-secondary">Total Value</div>
            <div className="text-body">$420</div>
          </div>
          <div className="flex justify-between text-xs">
            <div className="text-body-secondary">Estimated Fee</div>
            <div className="text-body">0.06 GMLR ($0.69)</div>
          </div>
          <div className="flex justify-between text-xs">
            <div className="text-body-secondary">Transaction Priority</div>
            <div className="text-body">Normal</div>
          </div>
        </div>
      </div>
      <SendButton />
    </div>
    //   <div className="flex h-full w-full flex-col overflow-hidden px-12 pb-8">
    //     <Container className="flex h-[9rem] w-full flex-col justify-center gap-5 px-8">
    //       <div className="flex w-full justify-between gap-4">
    //         <div>From</div>
    //         <div className="overflow-hidden">
    //           <AddressPillButton address={from} onClick={handleGotoClick("from")} />
    //         </div>
    //       </div>
    //       <div className="flex w-full justify-between gap-4">
    //         <div>To</div>
    //         <div className="overflow-hidden">
    //           <AddressPillButton address={to} onClick={handleGotoClick("to")} />
    //         </div>
    //       </div>
    //     </Container>
    //     <AmountEdit />
    //     <div className="w-full space-y-4 text-xs leading-[140%]">
    //       <TokenRow onEditClick={handleGotoClick("token")} />
    //       <NetworkRow />
    //       <EstimatedFeeRow />
    //     </div>
    //     <ReviewButton />
    //   </div>
    // </SendFundsDetailsProvider>
  )
}
