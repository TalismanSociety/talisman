import { ChainList } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"
import { Erc20Token, NativeToken, Token, TokenId } from "@core/domains/tokens/types"
import { getNetworkCategory } from "@core/util/getNetworkCategory"
import { scrollbarsStyle } from "@talisman/theme/styles"
import { classNames } from "@talisman/util/classNames"
import useChain from "@ui/hooks/useChain"
import useChains from "@ui/hooks/useChains"
import { useChainsTokensWithBalanceFirst } from "@ui/hooks/useChainsTokensWithBalanceFirst"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import useTokens from "@ui/hooks/useTokens"
import Downshift from "downshift"
import { FC, forwardRef, useCallback, useEffect, useMemo, useState } from "react"
import styled from "styled-components"

import GenericPicker, { PickerItemProps } from "./GenericPicker"
import Logo from "./Logo"
import { useTransferableTokens } from "./Send/useTransferableTokens"
import { TokenLogo } from "./TokenLogo"

const Container = styled.div`
  position: relative;
  display: inline-block;

  .btn-select-asset {
    background: transparent;
    border: none;
    padding: 0;
  }
  .btn-select-asset:hover .asset {
    color: var(--color-foreground-muted-2x);
  }

  .asset-dropdown {
    z-index: 1;
    display: flex;
    flex-direction: column;
    background: var(--color-background);
    border: 1px solid var(--color-background-muted);
    border-radius: var(--border-radius);
    position: absolute;
    top: -0.8rem;
    opacity: 0;
    transition: opacity var(--transition-speed) ease-in-out;
  }
  .asset-dropdown.mounted {
    opacity: 1;
  }

  .asset-search-container {
    padding: 0 1rem 1rem;
  }

  .asset-search {
    background: var(--color-background-muted);
    border: none;
    border-radius: var(--border-radius);
    outline: none;
    font-size: 3.2rem;
    font-weight: var(--font-weight-regular);
    line-height: 3.2rem;
    display: inline-block;
    color: var(--color-mid);
    min-width: 0;
    width: 21rem;
    padding: 1.1rem 2rem;
    font-size: 1.8rem;
    line-height: 1.8rem;
  }

  .asset-list {
    max-height: 25rem;
    overflow-y: auto;
    padding: 0;
    margin: 0;
    border-radius: 0 0 var(--border-radius) var(--border-radius);

    min-width: 100%;

    ${scrollbarsStyle()}

    li {
      padding: 0.6rem 1.2rem;
      line-height: 1;
      display: flex;

      .asset {
        width: 100%;
      }
    }
    li[aria-selected="true"] {
      background: var(--color-background-muted-3x);
    }
  }

  .asset {
    display: inline-flex;
    border: none;
    gap: 0.8rem;
    align-items: center;
    color: var(--color-mid);
    cursor: pointer;
  }

  .asset.asset-with-chain {
    .asset-main {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .token {
      font-size: var(--font-size-medium);
      line-height: 1;
    }
    .chain {
      font-size: var(--font-size-xsmall);
      color: var(--color-mid);
      line-height: 1;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
`

type DivWithMountProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>

// Purpose of this custom <div> component is just to have a .mounted class right after it's mounted, to use a CSS transition
// Downshift uses the ref, need to forward it
const DivWithMount = forwardRef<HTMLDivElement, DivWithMountProps>(
  ({ children, className, ...props }: DivWithMountProps, ref) => {
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => setIsMounted(true), [])
    return (
      <div ref={ref} className={classNames(className, isMounted && "mounted")} {...props}>
        {children}
      </div>
    )
  }
)

const SubstrateAsset: FC<{
  token?: Token
  withChainName?: boolean
}> = ({ token, withChainName = false }) => {
  const chain = useChain(token?.chain?.id)

  return (
    <span className={classNames("asset", withChainName && "asset-with-chain")}>
      <span className="asset-logo">
        <Logo id={token?.chain?.id} />
      </span>
      <span className={"asset-main"}>
        <span className="token">{token?.symbol}</span>
        {withChainName && <span className="chain">{chain?.name || <span>&nbsp;</span>}</span>}
      </span>
    </span>
  )
}

const EvmAsset: FC<{ token?: Erc20Token | NativeToken; withChainName?: boolean }> = ({
  token,
  withChainName = false,
}) => {
  const evmNetwork = useEvmNetwork(Number(token?.evmNetwork?.id ?? 0))

  // const effectiveChain = useMemo(() => {
  //   if (!chain && chainsMap && token?.chain?.id) return chainsMap[token?.chain?.id]
  //   return chain
  // }, [chain, chainsMap, token?.chain?.id])

  return (
    <span className={classNames("asset", withChainName && "asset-with-chain")}>
      <span className="asset-logo">
        <Logo id={token?.chain?.id} />
      </span>
      <span className={"asset-main"}>
        <span className="token">{token?.symbol}</span>
        {withChainName && <span className="chain">{evmNetwork?.name || <span>&nbsp;</span>}</span>}
      </span>
    </span>
  )
}

const Asset: FC<{ token: Token; withChainName?: boolean }> = ({ token, withChainName = false }) => {
  if (token.chain) return <SubstrateAsset token={token} withChainName={withChainName} />
  if ("evmNetwork" in token && token.evmNetwork)
    return <EvmAsset token={token} withChainName={withChainName} />
  else {
    // eslint-disable-next-line no-console
    console.debug("unknown token", token)
    return null
  }
}

// prevents searchbox to be filled with item.toString() when we select one
// we want to keep this an empty string to allow for a quick search without clearing the field
const handleItemToString = (tokenId?: TokenId | null) => ""

interface IProps {
  defaultValue?: TokenId
  value?: TokenId
  onChange?: (tokenId: TokenId) => void
  className?: string
  showChainsWithBalanceFirst?: boolean
}

type SendableToken = Token & { id: string; tokenId: TokenId }

const AssetPicker: FC<IProps> = ({
  defaultValue,
  value,
  onChange,
  className,
  showChainsWithBalanceFirst,
}) => {
  const chains = useChains()
  const evmNetworks = useEvmNetworks()
  const transferableTokens = useTransferableTokens(undefined, showChainsWithBalanceFirst)

  const items: PickerItemProps[] = transferableTokens.map((transferable) => {
    const { id, chainId, evmNetworkId, token } = transferable
    const chain = chains?.find((c) => c.id === chainId)
    const evmNetwork = evmNetworks?.find((n) => Number(n.id) === Number(evmNetworkId))
    const networkName = chain?.name || evmNetwork?.name
    // display type only if chain has an evm network, or vice versa
    const networkType =
      evmNetwork && (chain?.evmNetworks?.length || !!evmNetwork?.substrateChain) ? " (EVM)" : ""
    const subtitle = networkName + networkType
    return {
      id,
      logo: <TokenLogo tokenId={token.id} />,
      title: token.symbol,
      subtitle: subtitle,
    }
  })

  return (
    <GenericPicker
      className={className}
      items={items}
      onChange={onChange}
      value={value}
      defaultValue={defaultValue}
    />
  )

  // const [selectedTokenId, setSelectedTokenId] = useState<TokenId | undefined>(
  //   () => value ?? defaultValue ?? tokens[0]?.uid ?? undefined
  // )
  // const selectedToken = useMemo(
  //   () => tokensWithNormalSorting?.find((token) => token.uid === selectedTokenId),
  //   [tokensWithNormalSorting, selectedTokenId]
  // )

  // // if not set yet, set a token as soon as tokens are loaded
  // useEffect(() => {
  //   if (selectedTokenId === undefined && tokens.length > 0) setSelectedTokenId(tokens[0].uid)
  // }, [selectedTokenId, tokens])

  // // trigger parent's onChange
  // useEffect(() => {
  //   if (!onChange || !selectedTokenId) return
  //   if (value && value === selectedTokenId) return
  //   onChange(selectedTokenId)
  // }, [onChange, selectedTokenId, value])

  // const handleChange = useCallback((tokenId?: TokenId | null) => {
  //   if (tokenId) setSelectedTokenId(tokenId)
  // }, [])

  // // returns the list of tokens to display in the combo box, filtered by user input
  // const searchTokens = useCallback(
  //   (search: string | null) => {
  //     if (!search) return tokens
  //     const ls = search.toLowerCase()
  //     return tokens.filter(
  //       (token) => token.symbol?.toLowerCase().includes(ls)
  //       //   token.chain && chainsMap[token.chain.id]?.name?.toLowerCase().includes(ls)
  //       // ) || token.symbol?.toLowerCase().includes(ls)
  //     )
  //   },
  //   [tokens]
  // )

  // return (
  //   <Downshift onChange={handleChange} itemToString={handleItemToString}>
  //     {({
  //       getInputProps,
  //       getItemProps,
  //       isOpen,
  //       inputValue,
  //       getToggleButtonProps,
  //       getMenuProps,
  //       getRootProps,
  //     }) => (
  //       <Container className={className} {...getRootProps()}>
  //         {isOpen && (
  //           <DivWithMount className="asset-dropdown" {...getMenuProps()}>
  //             <div className="asset-search-container">
  //               <input
  //                 className="asset-search"
  //                 placeholder="Search tokens"
  //                 autoFocus
  //                 {...getInputProps()}
  //               />
  //             </div>
  //             <ul className="asset-list">
  //               {searchTokens(inputValue).map((token, index) => (
  //                 <li
  //                   className="asset-item"
  //                   {...getItemProps({
  //                     key: token.uid,
  //                     index,
  //                     item: token.uid,
  //                   })}
  //                 >
  //                   <Asset token={token} withChainName />
  //                 </li>
  //               ))}
  //             </ul>
  //           </DivWithMount>
  //         )}
  //         <button
  //           className="btn-select-asset"
  //           aria-label={"select asset"}
  //           {...getToggleButtonProps()}
  //         >
  //           {/* key is there to force rerender in case of missing logo */}
  //           {selectedToken && <Asset key={selectedToken?.uid ?? "EMPTY"} token={selectedToken} />}
  //         </button>
  //       </Container>
  //     )}
  //   </Downshift>
  // )
}

export default AssetPicker
