import { AccountJson } from "@polkadot/extension-base/background/types"
import { WithTooltip } from "@talisman/components/Tooltip"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { copyAddress } from "@ui/util/copyAddress"
import { FC, useCallback } from "react"
import styled from "styled-components"

import AccountAvatar from "./Avatar"

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
  const handleClick = useCallback(() => {
    copyAddress(account.address)
  }, [account.address])

  if (!account) return null
  return (
    <WithTooltip tooltip={account.address}>
      <Container onClick={handleClick}>
        <AccountAvatar address={account.address} />
        <span className="account-name">{account.name ?? shortenAddress(account.address)}</span>
      </Container>
    </WithTooltip>
  )
}
