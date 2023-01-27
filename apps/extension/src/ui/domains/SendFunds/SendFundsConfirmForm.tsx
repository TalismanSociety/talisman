import { notify } from "@talisman/components/Notifications"
import { LoaderIcon } from "@talisman/theme/icons"
import { BalanceFormatter } from "@talismn/balances"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useBalance } from "@ui/hooks/useBalance"
import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useTip } from "@ui/hooks/useTip"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "talisman-ui"

import { ChainLogo } from "../Asset/ChainLogo"
import Fiat from "../Asset/Fiat"
import { TokenLogo } from "../Asset/TokenLogo"
import Tokens from "../Asset/Tokens"
import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { AddressDisplay } from "./AddressDisplay"
import { SendFundsAddressPillButton } from "./SendFundsAddressPillButton"
import { useFeeToken } from "./useFeeToken"
import { useSendFundsEstimateFee } from "./useSendFundsEstimateFee"

const TokenDisplay = () => {
  const { tokenId, amount } = useSendFundsWizard()
  // const token = useToken(tokenId)
  // const tokenRates = useTokenRates(tokenId)

  // const sendAmount = useMemo(() => {
  //   return amount && token ? new BalanceFormatter(amount, token.decimals, tokenRates) : undefined
  // }, [amount, token, tokenRates])

  // if (!sendAmount || !token) return null

  return (
    <div className="inline-flex h-12 items-center gap-4">
      <TokenLogo tokenId={tokenId} className="inline-block text-lg" />
      <TokensAndFiat tokenId={tokenId} planck={amount} noCountUp />
      {/* // <Tokens
      //   amount={sendAmount.tokens}
      //   decimals={token.decimals}
      //   symbol={token.symbol}
      //   noCountUp
      // /> */}
    </div>
  )
}

// const AddressDisplay: FC<{ address?: string }> = ({ address }) => {
//   const handleClick = useCallback(async () => {
//     if (!address) return
//     const toastId = "copy"
//     try {
//       // TODO convert to chain format
//       await navigator.clipboard.writeText(address)
//       notify(
//         {
//           type: "success",
//           title: "Copy successful",
//           subtitle: "address copied to clipboard",
//         },
//         // set an id to prevent multiple clicks to display multiple notifications
//         { toastId }
//       )
//       return true
//     } catch (err) {
//       notify(
//         {
//           type: "error",
//           title: `Copy failed`,
//           subtitle: (err as Error).message,
//         },
//         { toastId }
//       )
//       return false
//     }
//   }, [address])

//   return <SendFundsAddressPillButton address={address} onClick={handleClick} />
// }

const NetworkDisplay = () => {
  const { tokenId } = useSendFundsWizard()
  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)

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

const TotalValueDisplay = () => {}

const TotalValueRow = () => {
  const { tokenId, amount } = useSendFundsWizard()
  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)

  const feeToken = useFeeToken(tokenId)
  const feeTokenRates = useTokenRates(feeToken?.id)

  const chain = useChain(token?.chain?.id)
  const { tip } = useTip(token?.chain?.id)
  const tipToken = useToken(chain?.nativeToken?.id)
  const tipTokenRates = useTokenRates(tipToken?.id)

  const totalValue = useMemo(() => {
    // Not all tokens have a fiat rate. if one of the 3 tokens doesn't have a rate, don't show the row
    if (!tokenRates || !feeTokenRates || (tip !== "0" && !tipTokenRates)) return null
    if (!token || !feeToken || (tip !== "0" && !tipToken)) return null

    const fiatAmount = new BalanceFormatter(amount, token.decimals, tokenRates).fiat("usd") ?? 0
    const fiatFee = new BalanceFormatter(amount, feeToken.decimals, tokenRates).fiat("usd") ?? 0
    const fiatTip =
      tip !== "0" && tipToken
        ? new BalanceFormatter(amount, tipToken.decimals, tokenRates).fiat("usd") ?? 0
        : 0

    return fiatAmount + fiatFee + fiatTip
  }, [amount, feeToken, feeTokenRates, tip, tipToken, tipTokenRates, token, tokenRates])

  if (!totalValue) return null

  return (
    <div className="mt-4 flex h-[1.7rem] justify-between text-xs">
      <div className="text-body-secondary">Total Value</div>
      <div className="text-body">
        <Fiat amount={totalValue} />
      </div>
    </div>
  )
}

const EstimateFeeDisplay = () => {
  const { from, to, amount, tokenId, allowReap } = useSendFundsWizard()
  const token = useToken(tokenId)
  const feeToken = useFeeToken(tokenId)
  const { tip } = useTip(token?.chain?.id, true) // TODO stop refreshing when validated
  const {
    data: dataEstimateFee,
    error: estimateFeeError,
    isFetching: isEstimatingFee,
  } = useSendFundsEstimateFee(from, to, tokenId, amount, tip, allowReap)

  const { estimatedFee, unsigned, pendingTransferId } = useMemo(() => {
    return dataEstimateFee ?? { estimatedFee: null, unsigned: null, pendingTransferId: null }
  }, [dataEstimateFee])

  // const feeTokenBalance = useBalance(from as string, feeToken?.id as string)

  // useEffect(() => {
  //   console.log({
  //     from,
  //     to,
  //     amount,
  //     tokenId,
  //     allowReap,
  //     token,
  //     feeToken,
  //     tip,
  //     dataEstimateFee,
  //     estimateFeeError,
  //     isEstimatingFee,
  //     estimatedFee,
  //   })
  // }, [allowReap, amount, dataEstimateFee, estimateFeeError, estimatedFee, feeToken, from, isEstimatingFee, tip, to, token, tokenId])

  return (
    <div className="inline-flex h-[1.7rem] items-center">
      {isEstimatingFee && <LoaderIcon className="animate-spin-slow mr-2 inline align-text-top" />}
      {estimatedFee && feeToken && <TokensAndFiat planck={estimatedFee} tokenId={feeToken.id} />}
    </div>
  )
}

const SendButton = () => {
  const { from, to, amount, tokenId, allowReap, transferAll, gotoProgress } = useSendFundsWizard()
  const token = useToken(tokenId)

  // Button should enable 1 second after the form shows up, to prevent sending funds accidentaly by double clicking the review button on previous screen
  const [ready, setReady] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    const timeout = setTimeout(() => {
      setReady(true)
    }, 1_000)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  const handleConfirmClick = useCallback(async () => {
    try {
      if (!from) throw new Error("Sender not found")
      if (!to) throw new Error("Recipient not found")
      if (!amount) throw new Error("Amount not found")
      if (!token) throw new Error("Token not found")

      setIsProcessing(true)

      if (token.chain?.id) {
        const { id } = await api.assetTransfer(
          token.chain.id,
          token.id,
          from,
          to,
          amount,
          "0", // TODO tip ?? "0"
          allowReap
        )
        gotoProgress({ substrateTxId: id })
      } else if (token.evmNetwork?.id) {
        throw new Error("Not implemented")
        // if (!gasSettings) throw new Error("Missing gas settings")
        // const { hash } = await api.assetTransferEth(
        //   evmNetworkId,
        //   token.id,
        //   from,
        //   to,
        //   amount,
        //   gasSettings
        // )
        // setTransactionHash(hash)
      } else throw new Error("Unknown network")
    } catch (err) {
      // ok
      setIsProcessing(false)
    }
  }, [allowReap, amount, from, gotoProgress, to, token])

  return (
    <>
      {errorMessage && <div className="to-brand-orange">{errorMessage}</div>}
      <Button
        className="w-full"
        primary
        disabled={!ready}
        onClick={handleConfirmClick}
        processing={isProcessing}
      >
        Confirm
      </Button>
    </>
  )
}

export const SendFundsConfirmForm = () => {
  const { from, to } = useSendFundsWizard()

  return (
    <div className="flex h-full w-full flex-col px-12 py-8">
      <div className="text-lg font-bold">You are sending</div>
      <div className="mt-24 w-full grow">
        <div className="bg-grey-900 text-body-secondary space-y-4 rounded px-8 py-4 leading-none">
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="text-body-secondary">Amount</div>
            <div className="text-body h-12">
              <TokenDisplay />
            </div>
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="text-body-secondary">From</div>
            <div className="text-body overflow-hidden">
              <AddressDisplay address={from} />
            </div>
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="text-body-secondary">To</div>
            <div className="text-body overflow-hidden">
              <AddressDisplay address={to} />
            </div>
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="text-body-secondary">Network</div>
            <div className="text-body  h-12 overflow-hidden">
              <NetworkDisplay />
            </div>
          </div>

          <div className="py-8">
            <hr />
          </div>

          <div className="flex h-[1.7rem] justify-between gap-8 text-xs">
            <div className="text-body-secondary">Transaction Priority</div>
            <div className="text-body">Normal</div>
          </div>
          <div className="mt-4 flex h-[1.7rem] justify-between gap-8 text-xs">
            <div className="text-body-secondary">Estimated Fee</div>
            <div className="text-body">
              <EstimateFeeDisplay />
            </div>
          </div>
          <TotalValueRow />
        </div>
      </div>
      <SendButton />
    </div>
  )
}
