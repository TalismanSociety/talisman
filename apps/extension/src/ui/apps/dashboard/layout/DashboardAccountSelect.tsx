import { AccountJsonAny } from "@core/types"
import { AllAccountsIcon, ChevronDownIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { shortenAddress } from "@talisman/util/shortenAddress"
import AccountAvatar from "@ui/domains/Account/Avatar"
import Fiat from "@ui/domains/Asset/Fiat"
import useBalances from "@ui/hooks/useBalances"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useSelect } from "downshift"
import { useEffect, useMemo } from "react"
import styled from "styled-components"
import { useDashboard } from "../context"

const Button = styled.button`
  background: none;
  border: none;
  width: 100%;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  border-radius: var(--border-radius);
  padding: 0;

  :hover {
    background-color: var(--color-background-muted-3x);
  }

  display: flex;
  align-items: center;
  .chevron {
    font-size: 2.4rem;
    color: var(--color-mid);
    margin-right: 1.6rem;
  }
  :hover .chevron {
    color: var(--color-foreground-muted);
  }
`

const AccountOptionContainer = styled.div`
  display: flex;
  gap: 1.6rem;
  padding: 1rem;
  width: 100%;
  overflow: hidden;
  color: var(--color-mid);

  .ao-avatar {
    .account-avatar {
      font-size: 4rem;
    }
  }
  .ao-rows {
    display: flex;
    flex-grow: 1;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
    gap: 0.4rem;

    .ao-rowName {
      width: 100%;
      gap: 1rem;
      justify-content: space-between;

      font-size: 1.4rem;
      overflow: hidden;

      white-space: nowrap;
      overflow: hidden;
      width: 100%;
      text-overflow: ellipsis;
    }
    .ao-rowFiat {
      font-size: 1.6rem;
    }
  }

  :hover {
    color: var(--color-foreground-muted);
  }
`

type AccountOptionProps = {
  address?: string
  totalUsd: number
  genesisHash?: string | null
  name?: string
}

const AccountOption = ({ address, totalUsd, genesisHash, name }: AccountOptionProps) => {
  return (
    <AccountOptionContainer>
      <div className="ao-avatar">
        {address ? (
          <AccountAvatar address={address} genesisHash={genesisHash} />
        ) : (
          <AllAccountsIcon className="account-avatar" />
        )}
      </div>
      <div className="ao-rows">
        <div className="ao-rowName">{name ?? shortenAddress(address)}</div>
        <div className="ao-rowFiat">
          <Fiat amount={totalUsd} currency="usd" isBalance noCountUp />
        </div>
      </div>
    </AccountOptionContainer>
  )
}

type SingleAccountOptionProps = Omit<AccountOptionProps, "totalUsd"> & { address: string }

const SingleAccountOption = (props: SingleAccountOptionProps) => {
  const { sum } = useBalancesByAddress(props.address)
  const { total } = useMemo(() => sum.fiat("usd"), [sum])

  return <AccountOption {...props} totalUsd={total} />
}

const AllAccountsOption = () => {
  const { sum } = useBalances()
  const { total } = useMemo(() => sum.fiat("usd"), [sum])

  return <AccountOption name="All accounts" totalUsd={total} />
}

const Container = styled.div`
  width: 100%;
  position: relative;

  &.open ${Button} {
    background-color: var(--color-background-muted-3x);
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  > ul {
    padding: 0;
    margin: 0;
    z-index: 10;
    position: absolute;
    left: 0;
    top: 6.4rem;
    width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    max-height: calc(100vh - 12rem);
    background-color: var(--color-background);
    border-bottom-left-radius: var(--border-radius);
    border-bottom-right-radius: var(--border-radius);

    li {
      padding: 0;
      margin: 0;
      list-style: none;
      cursor: pointer;

      :hover {
        background-color: var(--color-background-muted-3x);
      }
    }
  }
`

const OPTION_ALL_ACCOUNTS = { address: undefined } as unknown as AccountJsonAny

export const DashboardAccountSelect = () => {
  const { account, accounts, setSelectedAddress } = useDashboard()

  const items = useMemo<AccountJsonAny[]>(
    () => [OPTION_ALL_ACCOUNTS, ...accounts].filter((a) => a.address !== account?.address),
    [account?.address, accounts]
  )
  const { isOpen, selectedItem, getToggleButtonProps, getMenuProps, getItemProps } = useSelect<
    AccountJsonAny | undefined
  >({
    items,
    defaultSelectedItem: account,
  })

  useEffect(() => {
    if (selectedItem) {
      console.log({ selectedItem })
      setSelectedAddress(selectedItem.address)
    }
  }, [selectedItem, setSelectedAddress])

  return (
    <Container className={classNames(isOpen && "open")}>
      <Button type="button" {...getToggleButtonProps()}>
        {account ? <SingleAccountOption {...account} /> : <AllAccountsOption />}
        <ChevronDownIcon className="chevron" />
      </Button>
      <ul {...getMenuProps()}>
        {isOpen &&
          items.map((item, index) => (
            <li key={item.address ?? "all"} {...getItemProps({ item, index })}>
              {item.address ? <SingleAccountOption {...item} /> : <AllAccountsOption />}
            </li>
          ))}
      </ul>
    </Container>
  )
}
