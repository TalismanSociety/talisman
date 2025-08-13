import { encodeAnyAddress } from "@talismn/crypto"
import { classNames } from "@talismn/util"
import { Account } from "extension-core"
import { FC, useCallback, useMemo } from "react"

import { copyAddress } from "@ui/util/copyAddress"

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
    [account, ss58Format],
  )

  const handleClick = useCallback(() => {
    copyAddress(encodedAddress)
  }, [encodedAddress])

  if (!account) return null

  return (
    <button
      type="button"
      onClick={handleClick}
      className={classNames(
        "bg-grey-850 hover:bg-grey-800 text-body inline-block max-w-full rounded-3xl px-4",
        className,
      )}
    >
      <FormattedAddress address={encodedAddress} />
    </button>
  )
}
