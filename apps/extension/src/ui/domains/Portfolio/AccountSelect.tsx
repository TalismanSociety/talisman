import { AccountJsonAny } from "@core/domains/accounts/types"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { Box } from "@talisman/components/Box"
import { breakpoints } from "@talisman/theme/definitions"
import { AllAccountsIcon, ChevronDownIcon, UsbIcon } from "@talisman/theme/icons"
import { scrollbarsStyle } from "@talisman/theme/styles"
import { classNames } from "@talisman/util/classNames"
import { shortenAddress } from "@talisman/util/shortenAddress"
import AccountAvatar from "@ui/domains/Account/Avatar"
import Fiat from "@ui/domains/Asset/Fiat"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useBalances from "@ui/hooks/useBalances"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useSelect, UseSelectStateChange } from "downshift"
import { useCallback, useMemo } from "react"
import styled, { css } from "styled-components"

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
  align-items: center;
  gap: 0.8rem;
  padding: 1rem;
  width: 100%;
  overflow: hidden;
  color: var(--color-mid);

  .ao-avatar {
    display: flex;
    flex-direction: column;
    justify-content: center;
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

    .ao-rowName,
    .ao-rowFiat {
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

const RESPONSIVE_CONTAINER_STYLE = css`
  // medium sidebar
  @media (max-width: ${breakpoints.large}px) {
    .chevron {
      display: none;
    }
    ${Button} > div {
      align-items: center;
      flex-direction: column;
      gap: 0.8rem;
    }

    &.open ${Button} {
      border-bottom-left-radius: var(--border-radius);
      border-bottom-right-radius: var(--border-radius);
    }

    > ul {
      position: fixed;
      border-top-left-radius: var(--border-radius);
      border-top-right-radius: var(--border-radius);
      max-width: 24rem;
      top: 14rem;
      left: 2.4rem;
    }

    ${Button} .ao-rows {
      width: 100%;
      align-items: center;
      text-align: center;
    }
    ${Button} .ao-rows .ao-rowName {
      justify-content: center;
    }

    &.open > ul {
      border: 0.02rem solid var(--color-background-muted-3x);
      .current {
        border-bottom: 0.02rem solid var(--color-background-muted-3x);
      }
    }
  }

  // small sidebar
  @media (max-width: ${breakpoints.medium}px) {
    .current {
      display: inherit;
    }
    ${Button} .ao-rows, .chevron {
      display: none;
    }

    > ul {
      position: fixed;
      border-top-left-radius: var(--border-radius);
      border-top-right-radius: var(--border-radius);
      max-width: 24rem;
      top: 0.7rem;
      left: 0.6rem;
    }
  }
`

const Container = styled.div<{ responsive?: boolean }>`
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
    top: 6rem;
    width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    max-height: calc(100vh - 12rem);
    background-color: var(--color-background);
    border-bottom-left-radius: var(--border-radius);
    border-bottom-right-radius: var(--border-radius);

    ${scrollbarsStyle()}

    li {
      padding: 0;
      margin: 0;
      list-style: none;
      cursor: pointer;

      :hover {
        background-color: var(--color-background-muted-3x);
      }
    }

    li.current {
      background-color: var(--color-background-muted);
      ${AccountOptionContainer} {
        color: var(--color-foreground);
      }
    }
  }

  .current {
    display: none;
  }

  .ao-rows .ao-rowName > div:first-child {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    max-width: 100%;
    display: block;
  }

  ${({ responsive }) => (responsive ? RESPONSIVE_CONTAINER_STYLE : "")}
`

type AnyAccountOptionProps = { withTrack?: boolean }

type AccountOptionProps = AnyAccountOptionProps & {
  address?: string
  totalUsd: number
  genesisHash?: string | null
  name?: string
  isHardware?: boolean
}

type SingleAccountOptionProps = Omit<AccountOptionProps, "totalUsd"> & {
  address: string
}

const AccountOption = ({
  address,
  totalUsd,
  genesisHash,
  name,
  isHardware,
  withTrack,
}: AccountOptionProps) => {
  const { genericEvent } = useAnalytics()
  const handleClick = useCallback(() => {
    if (!withTrack) return
    genericEvent("select account(s)", {
      type: address ? (isEthereumAddress(address) ? "ethereum" : "substrate") : "all",
      from: "sidebar",
    })
  }, [address, genericEvent, withTrack])

  return (
    <AccountOptionContainer onClick={handleClick}>
      <div className="ao-avatar">
        {address ? (
          <AccountAvatar address={address} genesisHash={genesisHash} />
        ) : (
          <AllAccountsIcon className="account-avatar" />
        )}
      </div>
      <div className="ao-rows">
        <Box align="center" flex fullwidth className="ao-rowName" gap={0.4}>
          <Box overflow="hidden" textOverflow="ellipsis" noWrap flex column justify="center">
            {name ?? (address ? shortenAddress(address) : "unknown")}
          </Box>
          {isHardware && (
            <Box fg="primary" flex column justify="center">
              <UsbIcon />
            </Box>
          )}
        </Box>
        <div className="ao-rowFiat">
          <Fiat amount={totalUsd} currency="usd" isBalance noCountUp />
        </div>
      </div>
    </AccountOptionContainer>
  )
}

const SingleAccountOption = (props: SingleAccountOptionProps) => {
  const { sum } = useBalancesByAddress(props.address)
  const { total } = useMemo(() => sum.fiat("usd"), [sum])

  return <AccountOption {...props} totalUsd={total} />
}

const AllAccountsOption = ({ withTrack }: AnyAccountOptionProps) => {
  const { sum } = useBalances()
  const { total } = useMemo(() => sum.fiat("usd"), [sum])

  return <AccountOption name="All accounts" totalUsd={total} withTrack={withTrack} />
}

type AccountItem = {
  id: string
  name: string
  address?: string
  genesisHash?: string | null
  isHardware?: boolean
}
const OPTION_ALL_ACCOUNTS: AccountItem = {
  id: "all",
  name: "All accounts",
}

type AccountSelectProps = {
  responsive?: boolean
  className?: string
}

export const AccountSelect = ({ responsive, className }: AccountSelectProps) => {
  const { account, accounts, select } = useSelectedAccount()

  const items = useMemo<AccountItem[]>(
    () =>
      [OPTION_ALL_ACCOUNTS, ...accounts]
        .filter((a) => a.address !== account?.address)
        .map((a) => a as AccountItem),
    [account?.address, accounts]
  )

  const handleItemChange = useCallback(
    (changes: UseSelectStateChange<AccountItem | undefined>) => {
      select(changes.selectedItem?.address)
    },
    [select]
  )
  const { isOpen, getToggleButtonProps, getMenuProps, getItemProps, closeMenu } = useSelect<
    AccountItem | undefined
  >({
    items,
    selectedItem: undefined, // there should never be a selected item, as we don't display currently selected option in the dropdown itself
    onSelectedItemChange: handleItemChange,
  })

  return (
    <Container
      className={classNames(isOpen && "open", responsive && "responsive", className)}
      responsive={responsive}
    >
      <Button type="button" {...getToggleButtonProps()}>
        {account ? <SingleAccountOption {...account} /> : <AllAccountsOption />}
        <ChevronDownIcon className="chevron" />
      </Button>
      <ul {...getMenuProps()}>
        {isOpen && (
          <>
            {/* This first item is hidden by default, displayed only on small screen, when button contains only the avatar */}
            <li className="current" onClick={closeMenu}>
              {account ? <SingleAccountOption {...account} /> : <AllAccountsOption />}
            </li>
            {items.map((item, index) => (
              <li key={item.address ?? "all"} {...getItemProps({ item, index })}>
                {item.address ? (
                  <SingleAccountOption {...item} address={item.address} withTrack />
                ) : (
                  <AllAccountsOption withTrack />
                )}
              </li>
            ))}
          </>
        )}
      </ul>
    </Container>
  )
}
