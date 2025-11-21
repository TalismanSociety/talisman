import { NetworkId } from "@talismn/chaindata-provider"
import { papiStringify } from "@talismn/scale"
import { WalletTransaction } from "extension-core"
import { FC, ReactNode } from "react"
import { Trans, useTranslation } from "react-i18next"

import { CodeBlock } from "@talisman/components/CodeBlock"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"

import { TxHistoryDetailsAddress } from "./TxHistoryDetailsAddress"

export const TxHistoryDetailsTxInfo: FC<{
  tx: WalletTransaction
}> = ({ tx }) => {
  const txInfo = tx.txInfo
  if (!txInfo) return null

  switch (txInfo.type) {
    case "transfer":
      return <TransferTxInfo txInfo={txInfo} networkId={tx.networkId} />
    case "approve-erc20":
      return <ApproveErc20TxInfo txInfo={txInfo} networkId={tx.networkId} />
    case "swap-simpleswap":
      return <SwapSimpleSwapTxInfo txInfo={txInfo} networkId={tx.networkId} />
    case "swap-stealthex":
      return <SwapStealthExTxInfo txInfo={txInfo} networkId={tx.networkId} />
    case "swap-lifi":
      return <SwapLifiTxInfo txInfo={txInfo} networkId={tx.networkId} />
    default:
      return <CodeBlock code={papiStringify(tx.txInfo, 2)} />
  }
}

const TxInfoCard: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="bg-grey-800 scrollable scrollable-700 text-body-secondary leading-paragraph overflow-x-auto rounded-sm p-8 py-4">
    {children}
  </div>
)

const TransferTxInfo: FC<{
  networkId: NetworkId
  txInfo: Extract<WalletTransaction["txInfo"], { type: "transfer" }>
}> = ({ networkId, txInfo: { to, value, tokenId } }) => {
  const { t } = useTranslation()

  return (
    <TxInfoCard>
      <Trans
        t={t}
        defaults="Send <Tokens /> to <Address />"
        components={{
          Tokens: (
            <TokensAndFiat planck={value} tokenId={tokenId} withLogo noFiat className="text-body" />
          ),
          Address: <TxHistoryDetailsAddress address={to} networkId={networkId} />,
        }}
      />
    </TxInfoCard>
  )
}

const ApproveErc20TxInfo: FC<{
  networkId: NetworkId
  txInfo: Extract<WalletTransaction["txInfo"], { type: "approve-erc20" }>
}> = ({ networkId, txInfo: { contractAddress, amount, tokenId } }) => {
  const { t } = useTranslation()

  return (
    <TxInfoCard>
      <Trans
        t={t}
        defaults="Approve <Tokens /> for spending by <Address />"
        components={{
          Tokens: (
            <TokensAndFiat
              planck={amount}
              tokenId={tokenId}
              withLogo
              noFiat
              className="text-body"
            />
          ),
          Address: <TxHistoryDetailsAddress address={contractAddress} networkId={networkId} />,
        }}
      />
    </TxInfoCard>
  )
}

type SwapTxInfo = Extract<
  WalletTransaction["txInfo"],
  { type: "swap-simpleswap" | "swap-stealthex" | "swap-lifi" }
>

const SwapTxInfoCard: FC<{
  networkId: NetworkId
  txInfo: SwapTxInfo
  protocolLabel?: string
}> = ({ networkId, txInfo, protocolLabel }) => {
  const { t } = useTranslation()
  const label = protocolLabel ?? (txInfo.type === "swap-lifi" ? txInfo.protocolName : undefined)

  return (
    <TxInfoCard>
      <div className="flex flex-col gap-2">
        <div>
          <Trans
            t={t}
            defaults="Swap <FromTokens /> for <ToTokens />"
            components={{
              FromTokens: (
                <TokensAndFiat
                  planck={txInfo.fromAmount}
                  tokenId={txInfo.fromTokenId}
                  withLogo
                  noFiat
                  className="text-body"
                />
              ),
              ToTokens: (
                <TokensAndFiat
                  planck={txInfo.toAmount}
                  tokenId={txInfo.toTokenId}
                  withLogo
                  noFiat
                  className="text-body"
                />
              ),
            }}
          />
          {txInfo.to ? (
            <Trans
              t={t}
              defaults=" and send proceeds to <Address />"
              components={{
                Address: <TxHistoryDetailsAddress address={txInfo.to} networkId={networkId} />,
              }}
            />
          ) : null}
        </div>
        {label ? (
          <div className="text-body-secondary">
            <Trans
              t={t}
              defaults="Protocol: <Protocol />"
              components={{
                Protocol: <span className="text-body">{label}</span>,
              }}
            />
          </div>
        ) : null}
      </div>
    </TxInfoCard>
  )
}

const SwapSimpleSwapTxInfo: FC<{
  networkId: NetworkId
  txInfo: Extract<WalletTransaction["txInfo"], { type: "swap-simpleswap" }>
}> = ({ networkId, txInfo }) => (
  <SwapTxInfoCard networkId={networkId} txInfo={txInfo} protocolLabel="SimpleSwap" />
)

const SwapStealthExTxInfo: FC<{
  networkId: NetworkId
  txInfo: Extract<WalletTransaction["txInfo"], { type: "swap-stealthex" }>
}> = ({ networkId, txInfo }) => (
  <SwapTxInfoCard networkId={networkId} txInfo={txInfo} protocolLabel="StealthEX" />
)

const SwapLifiTxInfo: FC<{
  networkId: NetworkId
  txInfo: Extract<WalletTransaction["txInfo"], { type: "swap-lifi" }>
}> = ({ networkId, txInfo }) => (
  <SwapTxInfoCard networkId={networkId} txInfo={txInfo} protocolLabel={txInfo.protocolName} />
)
