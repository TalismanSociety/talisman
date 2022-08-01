import { ChainList } from "@core/domains/chains/types"
import { Erc20Token, NativeToken, Token, TokenId } from "@core/domains/tokens/types"
import { scrollbarsStyle } from "@talisman/theme/styles"
import { classNames } from "@talisman/util/classNames"
import useChain from "@ui/hooks/useChain"
import useChains from "@ui/hooks/useChains"
import { useChainsTokensWithBalanceFirst } from "@ui/hooks/useChainsTokensWithBalanceFirst"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useTokens from "@ui/hooks/useTokens"
import Downshift from "downshift"
import { FC, ReactNode, forwardRef, useCallback, useEffect, useMemo, useState } from "react"
import styled from "styled-components"

import Logo from "./Logo"
import { useTransferableTokens } from "./Send/useTransferableTokens"

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

type PickerItemId = string

export type PickerItemProps = {
  id: PickerItemId
  logo?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
}

const PickerItem = ({ logo, title, subtitle }: PickerItemProps) => {
  //const evmNetwork = useEvmNetwork(Number(token?.evmNetwork?.id ?? 0))

  // const effectiveChain = useMemo(() => {
  //   if (!chain && chainsMap && token?.chain?.id) return chainsMap[token?.chain?.id]
  //   return chain
  // }, [chain, chainsMap, token?.chain?.id])

  return (
    <span className={classNames("asset", !!subtitle && "asset-with-chain")}>
      {!!logo && <span className="asset-logo">{logo}</span>}
      <span className={"asset-main"}>
        <span className="token">{title}</span>
        {subtitle && <span className="chain">{subtitle}</span>}
      </span>
    </span>
  )
}

// prevents searchbox to be filled with item.toString() when we select one
// we want to keep this an empty string to allow for a quick search without clearing the field
const handleItemToString = (tokenId?: TokenId | null) => ""

const DEFAULT_SEARCH = (text: string | null, items: PickerItemProps[]) => {
  if (!text) return items
  const ls = text.toLowerCase()
  return items.filter(
    (item) =>
      item.title?.toString().toLowerCase().includes(ls) ||
      (typeof item.subtitle === "string" && item.subtitle.toLowerCase().includes(ls))
  )
}

type GenericPickerProps = {
  items: PickerItemProps[]
  defaultValue?: PickerItemId
  value?: PickerItemId
  onChange?: (id: PickerItemId) => void
  className?: string
  search?: (text: string | null, items: PickerItemProps[]) => PickerItemProps[]
}

const GenericPicker = ({
  items,
  defaultValue,
  value,
  onChange,
  className,
  search = DEFAULT_SEARCH,
}: GenericPickerProps) => {
  const [selectedItemId, setSelectedItemId] = useState<PickerItemId>(
    () => value ?? defaultValue ?? items[0]?.id ?? undefined
  )
  const selectedItem = useMemo(
    () => items?.find((item) => item.id === selectedItemId),
    [items, selectedItemId]
  )

  // if not set yet, set a token as soon as tokens are loaded
  useEffect(() => {
    if (selectedItemId === undefined && items.length > 0) setSelectedItemId(items[0].id)
  }, [items, selectedItemId])

  // trigger parent's onChange
  useEffect(() => {
    if (!onChange || !selectedItemId) return
    if (value && value === selectedItemId) return
    onChange(selectedItemId)
  }, [onChange, selectedItemId, value])

  const handleChange = useCallback((itemId?: PickerItemId | null) => {
    if (itemId) setSelectedItemId(itemId)
  }, [])

  // returns the list of tokens to display in the combo box, filtered by user input
  const searchItems = useCallback((text: string | null) => search(text, items), [items, search])

  return (
    <Downshift onChange={handleChange} itemToString={handleItemToString}>
      {({
        getInputProps,
        getItemProps,
        isOpen,
        inputValue,
        getToggleButtonProps,
        getMenuProps,
        getRootProps,
      }) => (
        <Container className={className} {...getRootProps()}>
          {isOpen && (
            <DivWithMount className="asset-dropdown" {...getMenuProps()}>
              <div className="asset-search-container">
                <input
                  className="asset-search"
                  placeholder="Search tokens"
                  autoFocus
                  {...getInputProps()}
                />
              </div>
              <ul className="asset-list">
                {searchItems(inputValue).map((item, index) => (
                  <li
                    className="asset-item"
                    {...getItemProps({
                      key: item.id,
                      index,
                      item: item.id,
                      // item: item.id,
                    })}
                  >
                    <PickerItem {...item} />
                  </li>
                ))}
              </ul>
            </DivWithMount>
          )}
          <button
            className="btn-select-asset"
            aria-label={"select asset"}
            {...getToggleButtonProps()}
          >
            {/* key is there to force rerender in case of missing logo */}
            {selectedItem && (
              <PickerItem key={selectedItem?.id ?? "EMPTY"} {...(selectedItem ?? {})} />
            )}
          </button>
        </Container>
      )}
    </Downshift>
  )
}

export default GenericPicker
