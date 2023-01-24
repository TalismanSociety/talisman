import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { IconAlert, InfoIcon, LoaderIcon, SwapIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { BalanceFormatter } from "@talismn/balances"
import { tokensToPlanck } from "@talismn/util"
import { SendFundsWizardPage, useSendFunds } from "@ui/apps/popup/pages/SendFunds/context"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { useInputNumberOnly } from "@ui/hooks/useInputNumberOnly"
import { useInputAutoSize } from "@ui/hooks/useTextWidth"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { isSubToken } from "@ui/util/isSubstrateToken"
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
import { Button, PillButton, classNames } from "talisman-ui"

import AccountAvatar from "../Account/Avatar"
import { ChainLogo } from "../Asset/ChainLogo"
import Fiat from "../Asset/Fiat"
import { TokenLogo } from "../Asset/TokenLogo"
import Tokens from "../Asset/Tokens"
import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { SendFundsDetailsProvider, useSendFundsDetails } from "./useSendFundsDetails"

const TokenDisplay = () => {
  const { tokenId, amount } = useSendFunds()
  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)

  const sendAmount = useMemo(() => {
    return amount && token ? new BalanceFormatter(amount, token.decimals, tokenRates) : undefined
  }, [amount, token, tokenRates])

  if (!sendAmount || !token) return null

  return (
    <Tokens amount={sendAmount.tokens} decimals={token.decimals} symbol={token.symbol} noCountUp />
  )
}

export const SendFundsConfirmForm = () => {
  // const { from, to, goto, amount } = useSendFunds()

  // const handleGotoClick = useCallback(
  //   (page: SendFundsWizardPage) => () => {
  //     goto(page)
  //   },
  //   [goto]
  // )

  return (
    <div className="flex h-full w-full flex-col px-12 py-8">
      <div className="text-lg font-bold">You are sending</div>
      <div className="mt-24 w-full grow">
        <div className="bg-grey-900 text-body-secondary rounded px-8 py-4">
          <div className=" space-y-4">
            <div className="flex justify-between">
              <div className="text-body-secondary">Amount</div>
              <div className="text-body">
                <TokenDisplay />
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-body-secondary">From</div>
              <div className="text-body"></div>
            </div>
            <div className="flex justify-between">
              <div className="text-body-secondary">To</div>
              <div className="text-body"></div>
            </div>
            <div className="flex justify-between">
              <div className="text-body-secondary">Network</div>
              <div className="text-body"></div>
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
      </div>

      <Button className="w-full" primary>
        Confirm
      </Button>
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
