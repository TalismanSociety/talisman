import type { Account } from "@core/domains/keyring/exports"
import { encodeAnyAddress } from "@talismn/crypto"
import { cn } from "@ui/util/cn"

import { copyAddress } from "@ui/util/copyAddress"
import { type FC, useCallback, useMemo } from "react"

import { FormattedAddress } from "./FormattedAddress"

type AccountPillProps = {
  account: Account
  ss58Format?: number
  className?: string
}

export const AccountPill: FC<AccountPillProps> = ({ account, ss58Format, className }) => {
  const encodedAddress = useMemo(
    () =>
      !!account && ss58Format !== undefined
        ? encodeAnyAddress(account.address, { ss58Format })
        : account?.address,
    [account, ss58Format]
  )

  const handleClick = useCallback(() => {
    copyAddress(encodedAddress)
  }, [encodedAddress])

  if (!account) return null

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-block max-w-full rounded-3xl bg-grey-850 px-4 text-body hover:bg-grey-800",
        className
      )}
    >
      <FormattedAddress address={encodedAddress} />
    </button>
  )
}
