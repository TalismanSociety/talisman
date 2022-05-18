import { FC } from "react"
import styled from "styled-components"
import { AccountJson } from "@polkadot/extension-base/background/types"
import CopyToClipboard from "@talisman/components/CopyToClipboard"
import AccountAvatar from "./Avatar"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { WithTooltip } from "@talisman/components/Tooltip"

const Container = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.8rem;
  background: var(--color-background-muted);
  border-radius: 4.8rem;
  gap: 0.6rem;
  cursor: pointer;
  vertical-align: middle;

  .account-name {
    color: var(--color-foreground-muted);
    font-size: var(--font-size-normal);
    line-height: var(--font-size-normal);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    max-width: 15rem;
  }
  .account-name:hover {
    color: var(--color-foreground);
  }

  .account-avatar {
    font-size: 1.6rem;
    line-height: 1em;
  }
`

type AccountPillProps = {
  account: AccountJson
  prefix?: number
}

export const AccountPill: FC<AccountPillProps> = ({ account, prefix }) => {
  if (!account) return null
  return (
    <CopyToClipboard value={account.address}>
      <WithTooltip tooltip={account.address}>
        <Container>
          <AccountAvatar address={account.address} />
          <span className="account-name">{account.name ?? shortenAddress(account.address)}</span>
        </Container>
      </WithTooltip>
    </CopyToClipboard>
  )
}
