import { Balances } from "@core/domains/balances/types"
import { FadeIn } from "@talisman/components/FadeIn"
import { CopyIcon, CreditCardIcon, LoaderIcon, LockIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { useAddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { useCallback, useMemo } from "react"
import styled from "styled-components"
import { PillButton } from "talisman-ui"

import { CopyAddressButton } from "./CopyAddressIconButton"
import { PortfolioAccount } from "./PortfolioAccount"
import { SendFundsButton } from "./SendFundsIconButton"
import { useAssetDetails } from "./useAssetDetails"
import { useChainTokenBalances } from "./useChainTokenBalances"

const FetchingIndicator = styled(LoaderIcon)`
  font-size: 1em;
  line-height: 1;
  margin-left: 0.4rem;
`

type AssetRowProps = {
  chainId: ChainId | EvmNetworkId
  balances: Balances
}

const ChainTokenBlock = styled.div`
  > div:first-child {
    border-top-left-radius: var(--border-radius-tiny);
    border-top-right-radius: var(--border-radius-tiny);
  }
  > div:last-child {
    border-bottom-left-radius: var(--border-radius-tiny);
    border-bottom-right-radius: var(--border-radius-tiny);
  }
`

const ChainTokenBalances = ({ chainId, balances }: AssetRowProps) => {
  const { chainOrNetwork, summary, symbol, detailRows, chain, isFetching, networkType } =
    useChainTokenBalances({ chainId, balances })

  // wait for data to load
  if (!chainOrNetwork || !summary || !symbol || balances.count === 0) return null

  return (
    <ChainTokenBlock className="text-body-secondary rounded text-sm">
      <div className="bg-grey-800 flex w-full items-center gap-6 border-transparent py-6 px-7">
        <div className="text-xl">
          <ChainLogo id={chainOrNetwork.id} />
        </div>
        <div className="flex grow flex-col justify-center gap-2 pr-8">
          <div className="flex justify-between font-bold text-white">
            <div className="flex items-center gap-4">
              {chainOrNetwork.name} <CopyAddressButton prefix={chain?.prefix} />
              <SendFundsButton symbol={symbol} networkId={chainOrNetwork.id} />
            </div>
          </div>
          <div className="text-body-secondary flex justify-between text-xs">
            <div>{networkType}</div>
          </div>
        </div>
      </div>
      {detailRows
        .filter((row) => row.tokens.gt(0))
        .map((row, i, rows) => (
          <div
            key={row.key}
            className={classNames(
              "bg-black-secondary flex w-full items-center gap-8 px-7 py-6",
              rows.length === i + 1 && "stop-row"
            )}
          >
            <div className="flex grow flex-col justify-center gap-2 overflow-hidden">
              <div className="font-bold text-white">{row.title}</div>
              {!!row.address && (
                <div className="text-xs">
                  <PortfolioAccount address={row.address} />
                </div>
              )}
            </div>
            <div
              className={classNames(
                "flex flex-col flex-nowrap justify-center gap-2 whitespace-nowrap text-right",
                isFetching && "animate-pulse transition-opacity"
              )}
            >
              <div
                className={classNames(
                  "font-bold",
                  row.locked ? "text-body-secondary" : "text-white"
                )}
              >
                <Tokens amount={row.tokens} symbol={symbol} isBalance />
                {row.locked ? (
                  <>
                    {" "}
                    <LockIcon className="lock inline align-baseline" />
                  </>
                ) : null}
              </div>
              <div className="text-xs">
                {row.fiat === null ? "-" : <Fiat currency="usd" amount={row.fiat} isBalance />}
              </div>
            </div>
          </div>
        ))}
    </ChainTokenBlock>
  )
}

type AssetsTableProps = {
  balances: Balances
  symbol: string
}

const NoTokens = ({ symbol }: { symbol: string }) => {
  const { account } = useSelectedAccount()
  const { open } = useAddressFormatterModal()

  const handleCopy = useCallback(() => {
    if (account?.address) open(account.address)
  }, [account?.address, open])

  const showBuyCrypto = useIsFeatureEnabled("BUY_CRYPTO")
  const handleBuyCryptoClick = useCallback(async () => {
    await api.modalOpen({ modalType: "buy" })
    window.close()
  }, [])

  return (
    <FadeIn>
      <div className="bg-field text-body-secondary leading-base rounded-sm p-10 text-center text-sm">
        <div>
          You don't have any {symbol} {account ? " in this account" : ""}
        </div>
        <div className="mt-6 flex justify-center gap-4">
          {!!account && (
            <PillButton icon={CopyIcon} onClick={handleCopy}>
              Copy Address
            </PillButton>
          )}
          {showBuyCrypto && (
            <PillButton icon={CreditCardIcon} onClick={handleBuyCryptoClick}>
              Buy Crypto
            </PillButton>
          )}
        </div>
      </div>
    </FadeIn>
  )
}

export const PopupAssetDetails = ({ balances, symbol }: AssetsTableProps) => {
  const { balancesByChain, isLoading } = useAssetDetails(balances)
  const rows = useMemo(() => Object.entries(balancesByChain), [balancesByChain])
  const hasBalance = useMemo(
    () => rows.some(([, balances]) => balances.sorted.some((b) => b.total.planck > BigInt(0))),
    [rows]
  )

  if (!hasBalance) return isLoading ? null : <NoTokens symbol={symbol} />

  return (
    <FadeIn>
      <div className="flex flex-col gap-8">
        {rows.map(([chainId, bal]) => (
          <ChainTokenBalances key={chainId} chainId={chainId} balances={bal} />
        ))}
      </div>
    </FadeIn>
  )
}
