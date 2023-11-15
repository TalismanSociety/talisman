import { AccountJson } from "@polkadot/extension-base/background/types"
import { classNames, encodeAnyAddress } from "@talismn/util"
import { copyAddress } from "@ui/util/copyAddress"
import { FC, useCallback, useMemo } from "react"

import { FormattedAddress } from "./FormattedAddress"

type AccountPillProps = {
  account: AccountJson
  prefix?: number
  className?: string
}

export const AccountPill: FC<AccountPillProps> = ({ account, prefix, className }) => {
  const encodedAddress = useMemo(
    () =>
      !!account && prefix !== undefined
        ? encodeAnyAddress(account.address, prefix)
        : account?.address,
    [account, prefix]
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
        "bg-grey-800 inline max-w-full rounded-3xl px-4 align-middle",
        className
      )}
    >
      <FormattedAddress address={encodedAddress} />
    </button>
  )
}
