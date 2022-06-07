import { AccountJsonAny } from "@core/types"
import { ChevronDownIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import AccountAvatar from "@ui/domains/Account/Avatar"
import Fiat from "@ui/domains/Asset/Fiat"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useSelect } from "downshift"
import { useEffect } from "react"
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

    .ao-rows .ao-rowName {
      color: var(--color-foreground-muted);
    }
  }
`

const AccountOptionContainer = styled.div`
  display: flex;
  gap: 1.6rem;
  padding: 1rem;
  width: 100%;
  overflow: hidden;

  .ao-avatar {
    .account-avatar {
      font-size: 4.8rem;
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
      height: 2rem; // why 2.4 without this ?
      display: flex;
      width: 100%;
      gap: 1rem;
      justify-content: space-between;
      color: var(--color-mid);
      font-size: 1.6rem;
      overflow: hidden;

      .ao-rowNameText {
        flex-grow: 1;
        white-space: nowrap;
        overflow: hidden;
        width: 100%;
        text-overflow: ellipsis;
      }

      svg {
        font-size: 2rem;
      }
    }
    .ao-rowFiat {
      font-size: 2rem;
      line-height: 1.6rem;
    }
  }
`

type AccountOptionProps = AccountJsonAny & { withChevron?: boolean; noCountUp?: boolean }

const AccountOption = ({
  address,
  genesisHash,
  name,
  withChevron,
  noCountUp,
}: AccountOptionProps) => {
  const { sum } = useBalancesByAddress(address)

  return (
    <AccountOptionContainer>
      <div className="ao-avatar">
        <AccountAvatar address={address} genesisHash={genesisHash} />
      </div>
      <div className="ao-rows">
        <div className="ao-rowName">
          <div className="ao-rowNameText">{name}</div>
          {withChevron && (
            <div>
              <ChevronDownIcon />
            </div>
          )}
        </div>
        <div className="ao-rowFiat">
          <Fiat
            amount={sum.fiat("usd").transferable}
            currency="usd"
            isBalance
            noCountUp={noCountUp}
          />
        </div>
      </div>
    </AccountOptionContainer>
  )
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
    top: 7.2rem;
    width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    max-height: calc(100vh - 12rem);
    background-color: var(--color-background-muted-3x);
    border-bottom-left-radius: var(--border-radius);
    border-bottom-right-radius: var(--border-radius);

    li {
      padding: 0;
      margin: 0;
      list-style: none;
      cursor: pointer;

      :hover {
        background-color: var(--color-background-muted-2x);
      }

      .ao-rows {
        .ao-rowName {
          color: var(--color-foreground);
        }
        .ao-rowFiat {
          color: var(--color-mid);
        }
      }
    }
  }
`

export const DashboardAccountSelect = () => {
  const { account, accounts, setSelectedAddress } = useDashboard()
  const { isOpen, selectedItem, getToggleButtonProps, getMenuProps, getItemProps } = useSelect({
    items: accounts,
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
        {account && <AccountOption withChevron {...account} />}
      </Button>
      <ul {...getMenuProps()}>
        {/* TODO all accounts */}
        {isOpen &&
          accounts
            .filter((a) => a.address !== account.address)
            .map((item) => (
              // can't forward the index arg because of the hidden account
              <li key={item.address} {...getItemProps({ item, index: accounts.indexOf(item) })}>
                <AccountOption {...item} noCountUp />
              </li>
            ))}
      </ul>
    </Container>
  )
}
