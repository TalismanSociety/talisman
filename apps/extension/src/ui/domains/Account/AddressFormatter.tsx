import { PropsWithChildren, useState } from "react"
import { encodeAnyAddress } from "@core/util"
import Logo from "../Asset/Logo"
import { ReactComponent as IconCopy } from "@talisman/theme/icons/copy.svg"
import { ReactComponent as IconAlert } from "@talisman/theme/icons/alert-circle.svg"
import { ReactComponent as IconCheck } from "@talisman/theme/icons/check.svg"
import { ReactComponent as IconSearch } from "@talisman/theme/icons/search.svg"
import styled from "styled-components"
import CopyToClipboard from "@talisman/components/CopyToClipboard"
import Input from "@talisman/components/Field/Input"
import useSortedChains from "@ui/hooks/useSortedChains"
import useHasPrefixChainsFilter from "@ui/hooks/useHasPrefixChainsFilter"
import useChainsAndSearchSymbols from "@ui/hooks/useChainsAndSearchSymbols"
import useMoonbeamChainsFilter from "@ui/hooks/useMoonbeamChainsFilter"
import { useSearchFilter } from "@talisman/hooks/useSearchFilter"
import { useNotification } from "@talisman/components/Notification"
import { Address } from "./Address"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { useAccountChainsFilter } from "@ui/hooks/useAccountChainsFilter"

interface IPropsAddressFormat extends PropsWithChildren<any> {
  name: string
  address: string
  id: string
}

const AddressFormat = styled(
  ({ name, address, id, className, onCopy, copied = false }: IPropsAddressFormat) => {
    return (
      <CopyToClipboard value={address} onCopy={onCopy}>
        <div className={`${className} flex gap`}>
          <span className="flex gap min-w-0">
            <Logo id={id} />
            <span className="min-w-0">
              <div className="truncate color-text">{name}</div>
              <Address as="div" className="subtext" address={address} />
            </span>
          </span>
          <span className="flex gap">
            {copied && (
              <span className="flex copied">
                <IconCheck /> Copied
              </span>
            )}
            <IconCopy className="copy" />
          </span>
        </div>
      </CopyToClipboard>
    )
  }
)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.4rem;
  padding: 1.2rem;

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
  const notification = useNotification()
  const chains = useSortedChains()
  const [copied, setCopied] = useState("")

  const accountCompatibleChains = useAccountChainsFilter(chains, address)
  const moonbeamFilteredChains = useMoonbeamChainsFilter(accountCompatibleChains, address)
  const chainsWithPrefix = useHasPrefixChainsFilter(moonbeamFilteredChains)
  const chainsAndSearchSymbols = useChainsAndSearchSymbols(chainsWithPrefix)

  const [searchQuery, setSearchQuery] = useState("")
  const filteredChains = useSearchFilter(
    searchQuery,
    ["name", "searchSymbols"],
    chainsAndSearchSymbols
  )

  return (
    <div className={className}>
      <SearchNetworks onSearch={setSearchQuery} />
      <div className="title">Choose the address format you would like to use</div>
      <InfoMessage>
        If sending funds from an exchange make sure you choose the correct address format.
      </InfoMessage>
      <div className="addresses-list">
        {filteredChains.map((chain) => {
          const convertedAddress = encodeAnyAddress(address, chain.prefix)
          return (
            <AddressFormat
              key={chain.id}
              id={chain.id}
              name={chain.name}
              address={convertedAddress}
              onCopy={() => {
                setCopied(chain.id)
                notification.success({
                  title: `${chain.name} address copied`,
                  subtitle: `Address: ${shortenAddress(convertedAddress)}`,
                })
                onClose()
              }}
              copied={chain.id === copied}
            />
          )
        })}
      </div>
    </div>
  )
})`
  color: var(--color-mid);

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
    max-height: 24rem;
    overflow: auto;
  }
`

export default AddressFormatter
