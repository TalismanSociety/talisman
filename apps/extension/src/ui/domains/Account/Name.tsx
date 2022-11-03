import { Balances } from "@core/domains/balances/types"
import { AccountJson } from "@polkadot/extension-base/background/types"
import { WithTooltip } from "@talisman/components/Tooltip"
import { LinkIcon, UsbIcon } from "@talisman/theme/icons"
import { ReactComponent as IconCopy } from "@talisman/theme/icons/copy.svg"
import { ReactComponent as IconLoader } from "@talisman/theme/icons/loader.svg"
import Asset from "@ui/domains/Asset"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { FC, useCallback } from "react"
import styled from "styled-components"

import { useAddressFormatterModal } from "./AddressFormatterModal"
import Avatar from "./Avatar"

export interface IAccountNameOptions {
  withAvatar?: boolean
  withBalanceRow?: boolean
  withCopy?: boolean
  withSource?: boolean
  withBackupIndicator?: boolean
}

type AccountTypeIconProps = {
  account?: AccountJson | null
  className?: string
}

const AccountTypeIcon: FC<AccountTypeIconProps> = ({ account, className }) => {
  if (["SEED", "JSON"].includes(account?.origin as string))
    return (
      <WithTooltip as="div" className={`${className} source`} tooltip={`${account?.origin} Import`}>
        <LinkIcon />
      </WithTooltip>
    )
  if (account?.origin === "HARDWARE")
    return (
      <WithTooltip as="div" className={`${className} source`} tooltip={`${account?.origin} Import`}>
        <UsbIcon />
      </WithTooltip>
    )
  return null
}

export interface IAccountName extends IAccountNameOptions {
  address: string
  balances?: Balances
  className?: string
}

const AccountName = ({
  address,
  balances,
  withAvatar,
  withBalanceRow,
  withCopy,
  withSource,
  className,
}: IAccountName) => {
  const account = useAccountByAddress(address)
  const { open } = useAddressFormatterModal()
  const handleCopyClick = useCallback(() => open(address), [address, open])

  return (
    <>
      <span className={`${className} account-name`}>
        {!!withAvatar && (
          <Avatar
            address={address}
            genesisHash={account?.isHardware ? account?.genesisHash : undefined}
          />
        )}
        <div className={`text${withBalanceRow ? " light" : ""}`}>
          <span className="account-name-row">
            <span className="name">{account?.name ?? address}</span>
            <span className="copy">
              {withCopy && (
                <IconCopy onClick={handleCopyClick} className={`${className} copyIcon`} />
              )}
            </span>
          </span>
          {!!withBalanceRow && balances && (
            <span className="balance">
              {balances.count > 0 ? (
                <Asset.Fiat
                  amount={balances.sum.fiat("usd").transferable}
                  currency="usd"
                  isBalance
                />
              ) : (
                <IconLoader data-spin />
              )}
            </span>
          )}
        </div>
      </span>
      {!!withSource && <AccountTypeIcon account={account} className={className} />}
    </>
  )
}

const StyledAccountName = styled(AccountName)`
  display: flex;
  align-items: center;
  max-width: 100%;
  overflow: hidden;

  > .account-avatar {
    margin-right: 1rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  > .text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    flex-direction: column;

    > .account-name-row {
      font-size: var(--font-size-medium);
      color: var(--color-mid);
      line-height: 1.4;
      display: inline-flex;

      .name {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      > div {
        line-height: inherit;
      }

      .copy {
        margin-left: 0.8rem;
        width: 1.8rem;
        min-width: 1.8rem;
        display: flex;
        flex-direction: column;
        justify-content: center;

        .copyIcon {
          font-size: 1.4rem;
          color: var(--color-mid);
          transition: all var(--transition-speed-fast) ease-in-out;
        }
        &:hover .copyIcon {
          color: var(--color-foreground);
        }
      }
    }

    > .balance {
      font-size: var(--font-size-xsmall);
      color: var(--color-mid);
      line-height: 1.4;
      height: 1.5rem; // force to prevent flickering

      span {
        font-size: var(--font-size-xsmall);
        line-height: inherit;
      }

      .balance-revealable {
        width: 5rem;
      }
    }
  }

  &.source {
    margin-left: 1rem;
    color: var(--color-primary);
    font-size: var(--font-size-small);
    cursor: auto;

    svg {
      display: block;
    }
  }

  > .backup {
    margin-left: 1rem;
  }
`

export default StyledAccountName
