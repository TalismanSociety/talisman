import styled from "styled-components"
import Name, { IAccountNameOptions } from "./Name"
import useBoolean from "@talisman/hooks/useBoolean"
import PopNav from "@talisman/components/PopNav"
import { ReactComponent as IconLoader } from "@talisman/theme/icons/loader.svg"
import { PaperPlaneIcon, IconMore, IconChevron } from "@talisman/theme/icons"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import useEmptyBalancesFilter from "@ui/hooks/useEmptyBalancesFilter"
import Asset, { IAssetRowOptions } from "@ui/domains/Asset"
import downloadJson from "@talisman/util/downloadJson"
import { MouseEventHandler, useCallback } from "react"
import { api } from "@ui/api"
import { useSendTokensModal } from "../Asset/Send"
import { useAddressFormatterModal } from "./AddressFormatterModal"
import { useAccountRenameModal } from "./AccountRenameModal"
import { useAccountRemoveModal } from "./AccountRemoveModal"
import { useOpenableComponent } from "@talisman/hooks/useOpenableComponent"

export interface IAccountItemOptions extends IAccountNameOptions, IAssetRowOptions {
  withBalanceInline?: boolean
  withBalanceRow?: boolean
  withSend?: boolean
}

export interface IAccountItem extends IAccountItemOptions {
  address: string
  className?: string
}

const AccountItem = ({
  address,
  withAvatar,
  withCopy,
  withSource,
  withBackupIndicator,
  withBalanceInline,
  withBalanceRow,
  withSend,
  withFiat,
  className,
}: IAccountItem) => {
  const [isOpen, toggleOpen] = useBoolean()
  // rows use transition-speed-slow => 0.2s
  const { render, show } = useOpenableComponent(isOpen, 200)
  const account = useAccountByAddress(address)
  const balances = useBalancesByAddress(address)
  const { open: openAddressFormatter } = useAddressFormatterModal()
  const { open: openAccountRename } = useAccountRenameModal()
  const { open: openAccountRemove } = useAccountRemoveModal()
  const { open: openSendTokensModal } = useSendTokensModal()
  const notEmptyBalances = useEmptyBalancesFilter(balances, account)

  const handleSendClick: MouseEventHandler = useCallback(
    (e) => {
      e.stopPropagation()
      const balance =
        notEmptyBalances.sorted.find((balance) => balance.free.planck > BigInt("0")) ??
        notEmptyBalances.sorted[0]
      openSendTokensModal({
        from: address,
        tokenId: balance?.tokenId,
      })
      return
    },
    [address, notEmptyBalances.sorted, openSendTokensModal]
  )

  return (
    <section className={className} data-open={render}>
      <header onClick={toggleOpen}>
        <span className="grow">
          <Name
            address={address}
            balances={balances}
            withAvatar={withAvatar}
            withBalanceRow={withBalanceRow}
            withCopy={withCopy}
            withSource={withSource}
            withBackupIndicator={withBackupIndicator}
          />
        </span>
        <span className="options">
          {!!withBalanceInline && (
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
          {!!withSend && <PaperPlaneIcon className="icon send" onClick={handleSendClick} />}
          <PopNav trigger={<IconMore />} className="icon more" closeOnMouseOut>
            <PopNav.Item onClick={() => openAddressFormatter(address)}>Copy address</PopNav.Item>
            <PopNav.Item onClick={() => openAccountRename(address)}>Rename</PopNav.Item>
            {["SEED", "JSON", "DERIVED"].includes(account?.origin as string) && (
              <PopNav.Item
                onClick={async () => {
                  const { exportedJson } = await api.accountExport(address)
                  downloadJson(exportedJson, `${exportedJson.meta?.name || "talisman"}`)
                }}
              >
                Export Private Key
              </PopNav.Item>
            )}
            {["SEED", "JSON", "HARDWARE"].includes(account?.origin as string) && (
              <PopNav.Item onClick={() => openAccountRemove(address)}>Remove Account</PopNav.Item>
            )}
          </PopNav>
          <IconChevron className="icon chevron" onClick={toggleOpen} />
        </span>
      </header>
      <article>
        {render && (
          <>
            {notEmptyBalances.count < 1 && (
              <span className="balances-loading">
                <IconLoader data-spin />
              </span>
            )}
            {notEmptyBalances.sorted.map((balance) => (
              <Asset.Row key={balance.id} balance={balance} withFiat={withFiat} show={show} />
            ))}
          </>
        )}
      </article>
    </section>
  )
}

const StyledAccountItem = styled(AccountItem)`
  margin-bottom: 1.7rem;
  position: relative;

  > header {
    display: flex;
    justify-content: space-between;
    cursor: pointer;
    position: relative;
    gap: 2rem;

    > span {
      display: flex;
      align-items: center;
    }
    > span.grow {
      overflow: hidden;

      > .account-name {
        padding: 0.3rem 0;
      }
    }

    .account-name .text .account-name-row {
      transition: color var(--transition-speed) ease-in-out;
      color: var(--color-foreground-muted-2x);

      svg {
        font-size: 0.7em;
        vertical-align: top;
      }
    }

    .account-name .text .balance {
      font-size: var(--font-size-normal);
      display: flex;
      align-items: start;
      margin-right: 2rem;

      > svg {
        margin-left: 0.2em;
      }
    }

    .icon {
      font-size: var(--font-size-large);
      cursor: pointer;
      opacity: 0.6;
      transition: all var(--transition-speed) ease-in-out;

      &:hover {
        opacity: 1;
      }

      &.send,
      &.more {
        width: 0;
        margin-right: 0;
      }
    }

    .account-name,
    .account-name .account-name-row {
      color: var(--color-mid);
    }

    :hover {
      .account-name,
      .account-name .text .account-name-row {
        color: var(--color-foreground);
      }

      span.options svg {
        opacity: 1;
      }
    }

    .fiat.balance-revealable {
      min-width: 9rem;
      display: inline-block;
      text-align: right;
      border: none;
    }

    .account-name .fiat.balance-revealable {
      text-align: left;
    }

    .balance {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
  }

  > article {
    margin-top: 0;
    transition: all var(--transition-fast) ease-in;
    transition-property: margin-top, gap;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  > article > .balances-loading {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  &[data-open="true"] {
    > header {
      .account-name .account-name-row {
        color: var(--color-foreground);
      }
    }

    > article {
      margin-top: 1em;
    }

    .icon {
      &.send,
      &.more {
        width: 1em;
      }
      &.more {
        margin-right: 1rem;
      }
      &.send {
        margin-left: 1rem;
        margin-right: 1rem;
      }
    }

    .icon.chevron {
      transform: rotate(90deg);
    }
  }
`

export default StyledAccountItem
