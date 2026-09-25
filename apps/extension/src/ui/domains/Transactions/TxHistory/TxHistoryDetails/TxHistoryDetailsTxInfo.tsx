import type { WalletTransaction } from "@core/domains/transactions/types"
import { type NetworkId, networkIdFromTokenId, parseTokenId } from "@talismn/chaindata-provider"
import { papiStringify } from "@talismn/scale"
import { CodeBlock } from "@ui/components/CodeBlock"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import type { FC, ReactNode } from "react"
import { Trans, useTranslation } from "react-i18next"

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
      return <SwapTxInfoCard txInfo={txInfo} protocolLabel="SimpleSwap" />
    case "swap-stealthex":
      return <SwapTxInfoCard txInfo={txInfo} protocolLabel="StealthEX" />
    case "swap-lifi":
      return <SwapTxInfoCard txInfo={txInfo} protocolLabel={txInfo.protocolName} />
    case "swap-bittensor-evm":
      return <SwapTxInfoCard txInfo={txInfo} protocolLabel="Bittensor EVM" />
    case "swap-forevermoney":
      return <SwapTxInfoCard txInfo={txInfo} protocolLabel="ForeverMoney" />
    case "bittensor-staking":
      return <BittensorStakingTxInfo txInfo={txInfo} />
    default:
      return <CodeBlock code={papiStringify(tx.txInfo, 2)} />
  }
}

const TxInfoCard: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="scrollable scrollable-700 overflow-x-auto rounded-sm bg-grey-800 p-8 py-4 text-body-secondary leading-paragraph">
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
  {
    type:
      | "swap-simpleswap"
      | "swap-stealthex"
      | "swap-lifi"
      | "swap-bittensor-evm"
      | "swap-forevermoney"
  }
>

const SwapNetworkLabel: FC<{ networkId: NetworkId }> = ({ networkId }) => (
  <span className="text-body">
    <NetworkLogo
      networkId={networkId}
      className="mr-[0.3em] inline-block size-[1.2em] shrink-0 align-sub"
    />
    <NetworkName networkId={networkId} />
  </span>
)

const SwapTxInfoCard: FC<{
  txInfo: SwapTxInfo
  protocolLabel: string
}> = ({ txInfo, protocolLabel }) => {
  const { t } = useTranslation()
  const fromNetworkId = networkIdFromTokenId(txInfo.fromTokenId)
  const toNetworkId = networkIdFromTokenId(txInfo.toTokenId)
  const isCrossChain = fromNetworkId !== toNetworkId

  const tokenComponents = {
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
  }

  return (
    <TxInfoCard>
      <div className="flex flex-col gap-2">
        <div>
          {isCrossChain ? (
            <Trans
              t={t}
              defaults="Swap <FromTokens /> on <FromNetwork /> for <ToTokens /> on <ToNetwork />"
              components={{
                ...tokenComponents,
                FromNetwork: <SwapNetworkLabel networkId={fromNetworkId} />,
                ToNetwork: <SwapNetworkLabel networkId={toNetworkId} />,
              }}
            />
          ) : (
            <Trans
              t={t}
              defaults="Swap <FromTokens /> for <ToTokens />"
              components={tokenComponents}
            />
          )}
          {txInfo.to ? (
            <Trans
              t={t}
              defaults=" and send proceeds to <Address />"
              components={{
                Address: <TxHistoryDetailsAddress address={txInfo.to} networkId={toNetworkId} />,
              }}
            />
          ) : null}
        </div>
        <div className="text-body-secondary">
          <Trans
            t={t}
            defaults="Protocol: <Protocol />"
            components={{
              Protocol: <span className="text-body">{protocolLabel}</span>,
            }}
          />
        </div>
      </div>
    </TxInfoCard>
  )
}

const BittensorStakingTxInfo: FC<{
  txInfo: Extract<WalletTransaction["txInfo"], { type: "bittensor-staking" }>
}> = ({ txInfo }) => {
  const { t } = useTranslation()
  // Stake: TAO (substrate-native) -> ALPHA, Unstake: ALPHA -> TAO
  const isStake = parseTokenId(txInfo.fromTokenId).type === "substrate-native"

  const components = {
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
  }

  return (
    <TxInfoCard>
      {isStake ? (
        <Trans t={t} defaults="Stake <FromTokens /> for <ToTokens />" components={components} />
      ) : (
        <Trans t={t} defaults="Unstake <FromTokens /> for <ToTokens />" components={components} />
      )}
    </TxInfoCard>
  )
}
