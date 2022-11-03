import { Chain } from "@core/domains/chains/types"
import Input from "@talisman/components/Field/Input"
import { useSearchFilter } from "@talisman/hooks/useSearchFilter"
import { ReactComponent as IconAlert } from "@talisman/theme/icons/alert-circle.svg"
import { ReactComponent as IconCheck } from "@talisman/theme/icons/check.svg"
import { ReactComponent as IconCopy } from "@talisman/theme/icons/copy.svg"
import { ReactComponent as IconSearch } from "@talisman/theme/icons/search.svg"
import { encodeAnyAddress } from "@talismn/util"
import { useAccountChainsFilter } from "@ui/hooks/useAccountChainsFilter"
import useAddressTypeChainsFilter from "@ui/hooks/useAddressTypeChainsFilter"
import useChainsAndSearchSymbols from "@ui/hooks/useChainsAndSearchSymbols"
import useHasPrefixChainsFilter from "@ui/hooks/useHasPrefixChainsFilter"
import { useSortedChains } from "@ui/hooks/useSortedChains"
import { copyAddress } from "@ui/util/copyAddress"
import { PropsWithChildren, useCallback, useState } from "react"
import styled from "styled-components"

import Logo from "../Asset/Logo"
import { Address } from "./Address"

type AddressFormatProps = {
  name: string | null
  address: string
  id: string
  className?: string
  copied?: boolean
  onClick: () => void
}

const AddressFormat = styled(
  ({ name, address, id, className, onClick, copied }: AddressFormatProps) => {
    return (
      <div onClick={onClick} className={`${className} gap flex`}>
        <span className="gap flex min-w-0">
          <Logo id={id} />
          <span className="min-w-0">
            <div className="color-text truncate">{name}</div>
            <Address as="div" className="subtext" address={address} />
          </span>
        </span>
        <span className="gap flex">
          {copied && (
            <span className="copied flex">
              <IconCheck /> Copied
            </span>
          )}
          <IconCopy className="copy" />
        </span>
      </div>
    )
  }
)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.4rem;
  padding: 1.2rem;
  padding-left: 0;

  :hover {
    cursor: pointer;
  }

  .min-w-0 {
    min-width: 0;
  }

  .truncate {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }

  .color-text {
    color: var(--color-foreground-muted);
  }

  .subtext {
    color: var(--color-mid);
    font-size: small;
  }

  .gap {
    gap: 1.4rem;
  }

  .flex {
    display: flex;
    align-items: center;
  }

  .copied {
    gap: 0.5rem;
    color: var(--color-primary);
    font-size: small;
  }

  .chain-logo {
    width: 2.4rem;
    height: 2.4rem;
  }
`

const InfoMessage = styled(({ className, children }) => {
  return (
    <div className={className}>
      <IconAlert className="icon" />
      <span>{children}</span>
    </div>
  )
})`
  display: flex;
  gap: 0.75rem;
  color: var(--color-background-muted-2x);
  font-size: small;

  .icon {
    width: 2.5rem;
    height: 2.5rem;
  }
`

const SearchNetworks = styled(({ className, onSearch }) => {
  return (
    <Input
      className={`${className} search-networks`}
      prefix={<IconSearch />}
      onChange={onSearch}
      fieldProps={{
        placeholder: "Search for networks",
        autoFocus: true,
      }}
    />
  )
})`
  > .children {
    background: transparent;
    border: 1px solid var(--color-background-muted);
  }
`

interface IPropsAddressFormatter extends PropsWithChildren<any> {
  address: string
  onClose: () => void
}

const AddressFormatter = styled(({ address, className, onClose }: IPropsAddressFormatter) => {
  const chains = useSortedChains()
  const [copied, setCopied] = useState("")

  const accountCompatibleChains = useAccountChainsFilter(chains, address)
  const addressTypeCompatibleChains = useAddressTypeChainsFilter(accountCompatibleChains, address)
  const chainsWithPrefix = useHasPrefixChainsFilter(addressTypeCompatibleChains)
  const chainsAndSearchSymbols = useChainsAndSearchSymbols(chainsWithPrefix)

  const [searchQuery, setSearchQuery] = useState("")
  const filteredChains = useSearchFilter(
    searchQuery,
    ["name", "searchSymbols"],
    chainsAndSearchSymbols
  )

  const handleCopyClick = useCallback(
    (chain: Chain, convertedAddress: string) => async () => {
      setCopied(chain.id)
      if (await copyAddress(convertedAddress, `${chain.name} address copied`)) onClose()
    },
    [onClose]
  )

  return (
    <div className={className}>
      <SearchNetworks onSearch={setSearchQuery} />
      <div className="title">Choose the address format you would like to use</div>
      <InfoMessage>
        If sending funds from an exchange make sure you choose the correct address format.
      </InfoMessage>
      <div className="addresses-list scrollbars">
        {filteredChains.map((chain) => {
          const convertedAddress = encodeAnyAddress(address, chain.prefix)
          return (
            <AddressFormat
              key={chain.id}
              id={chain.id}
              name={chain.name}
              address={convertedAddress}
              onClick={handleCopyClick(chain, convertedAddress)}
              copied={chain.id === copied}
            />
          )
        })}
      </div>
    </div>
  )
})`
  color: var(--color-mid);
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  overflow: hidden;

  .flex {
    display: flex;
  }

  .gap {
    gap: 1.4rem;
  }

  .title {
    margin-top: 1.2rem;
  }

  .addresses-list {
    margin-top: 1.2rem;
    flex-grow: 1;
    overflow: auto;
  }
`

export default AddressFormatter
