import Pill from "@talisman/components/Pill"
import { SimpleButton } from "@talisman/components/SimpleButton"
import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { Suspense, lazy, useCallback, useEffect, useState } from "react"
import styled from "styled-components"
import { formatDecimals } from "talisman-utils"

import Fiat from "../Fiat"
import AssetLogo from "../Logo"
import { TokenLogo } from "../TokenLogo"
import { Tokens } from "../Tokens"
import { useSendTokens } from "./context"
import { SendDialogContainer } from "./SendDialogContainer"
import { SendForfeitInfo } from "./SendForfeitInfo"
import { SendReviewAddress } from "./SendReviewAddress"
import { SendTokensExpectedResult, SendTokensInputs } from "./types"
import { useTransferableTokenById } from "./useTransferableTokens"

const SendAddressConvertInfo = lazy(() => import("./SendAddressConvertInfo"))
const SendLedgerSubstrate = lazy(() => import("./SendLedgerSubstrate"))
const SendLedgerEthereum = lazy(() => import("./SendLedgerEthereum"))

const Container = styled(SendDialogContainer)`
  display: flex;
  flex-direction: column;

  > article {
    display: flex;
    flex-direction: column;

    align-items: center;
    justify-content: flex-start;
    text-align: left;

    h1 {
      width: 100%;
      font-size: var(--font-size-large);
      font-weight: var(--font-weight-normal);
      text-align: center;
    }

    h2 {
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
      width: 100%;
      font-size: var(--font-size-large);
      font-weight: var(--font-weight-regular);
      color: var(--color-foreground);
      line-height: var(--font-size-xlarge);
      strong {
        font-weight: var(--font-weight-regular);
      }
      margin-bottom: 0;
    }

    > div {
      width: 100%;
    }

    .account-avatar {
      font-size: 1em;
    }
  }
  > footer .info {
    justify-content: flex-start;
    gap: 0.4em;
  }
  .buttons {
    display: flex;
    gap: 1.4rem;
    width: 100%;
    button {
      flex-grow: 1;
    }
  }

  .nowrap {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    .chain-logo {
      display: inline-block;
      vertical-align: middle;
      margin-bottom: 0.5rem;
    }
  }

  .lm {
    margin-left: 0.8rem;
  }

  .ledger-connection {
    min-height: 5.6rem;
    margin: 0;
  }
`

const Row = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
`

const AssetRow = styled(Row)`
  gap: 0.8rem;
`

const Grey = styled.span`
  color: var(--color-mid);
`

const NetworkPill = styled(Pill)`
  background: var(--color-background-muted);
  color: var(--color-mid);
  padding: 0.4rem 0.8rem;

  .chain-name {
    font-size: 1.4rem;
    line-height: 1.6rem;
  }
`

export const SendReviewHeader = () => {
  const { formData } = useSendTokens()
  const transferableToken = useTransferableTokenById(formData.transferableTokenId)
  const { token } = transferableToken || {}
  const chainId = token?.chain?.id
  const chain = useChain(chainId)
  if (!chain) return null

  return (
    <NetworkPill>
      <AssetLogo id={chain.id} />
      <span className="chain-name">{chain.name}</span>
    </NetworkPill>
  )
}

const SendReview = () => {
  const { formData, expectedResult, send, showReview, approvalMode } = useSendTokens()
  const transferableToken = useTransferableTokenById(formData.transferableTokenId)
  const { token } = transferableToken || {}
  const chain = useChain(transferableToken?.chainId)
  const evmNetwork = useEvmNetwork(transferableToken?.evmNetworkId)

  const [error, setError] = useState<string>()
  const [sending, setSending] = useState(false)

  const handleSend = useCallback(async () => {
    setSending(true)
    try {
      await send()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    }
    setSending(false)
  }, [send])

  // reset if going back and forth
  useEffect(() => {
    setError(undefined)
    setSending(false)
  }, [showReview])

  if (!showReview || (!chain && !evmNetwork)) return null

  // force typings to get data to be displayed
  const { fees, transfer, pendingTransferId } = expectedResult as SendTokensExpectedResult
  const { from, to } = formData as SendTokensInputs

  return (
    <Container>
      <article>
        <h2>
          <Row>You are sending</Row>
          <AssetRow>
            <span>{formatDecimals(transfer.amount.tokens, transfer.decimals)}</span>
            <TokenLogo tokenId={token?.id} />
            <span>{transfer.symbol}</span>
            {transfer.amount.fiat("usd") !== null && (
              <Grey>
                (<Fiat noCountUp amount={transfer.amount.fiat("usd")} currency="usd" />)
              </Grey>
            )}
          </AssetRow>
          <Row>
            <span>from</span>
            <SendReviewAddress address={from} chainId={chain?.id} />
          </Row>
          <Row>
            <span>to</span>
            <SendReviewAddress address={to} chainId={chain?.id} />
          </Row>
        </h2>
        <div>
          {!!chain && (
            <Suspense fallback={null}>
              <SendAddressConvertInfo review address={to} chainId={chain.id} />
            </Suspense>
          )}
          <SendForfeitInfo expectedResult={expectedResult} />
        </div>
      </article>
      <footer>
        {/* prevent flickering by hiding the whole footer while ledger is loading */}
        <Suspense fallback={null}>
          <div className="message">{error}</div>
          {!!fees && (
            <div className="info">
              <span>{transferableToken?.evmNetworkId ? "Max fee:" : "Fee:"}</span>
              <Tokens
                amount={fees.amount.tokens}
                symbol={fees.symbol}
                decimals={fees.decimals}
                noCountUp
              />
              {fees.amount.fiat("usd") !== null && (
                <>
                  <span> / </span>
                  <Fiat noCountUp amount={fees.amount.fiat("usd")} currency="usd" />
                </>
              )}
            </div>
          )}
          {approvalMode === "hwSubstrate" && <SendLedgerSubstrate />}
          {approvalMode === "hwEthereum" && <SendLedgerEthereum />}
          {approvalMode === "backend" && (
            <div className="buttons">
              <SimpleButton
                primary
                onClick={handleSend}
                processing={sending}
                disabled={sending || !!pendingTransferId}
              >
                {pendingTransferId ? "Ledger approval" : "Approve"}
              </SimpleButton>
            </div>
          )}
        </Suspense>
      </footer>
    </Container>
  )
}

// use default export to enable lazy loading
export default SendReview
