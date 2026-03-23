import type { IdenticonType } from "@core/domains/accounts/types"
import type { Address } from "@core/types/base"
import { useAccounts } from "@ui/state/accounts"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useMemo } from "react"

import { AccountIcon } from "../Account/AccountIcon"

type SelectableAvatarProps = {
  type: IdenticonType
  address: Address
  selected: boolean
  onClick: () => void
}

const AvatarOption: FC<SelectableAvatarProps> = ({ address, type, selected, onClick }) => {
  return (
    <button
      type="button"
      className={cn("h-9.5 w-9.5 rounded-full p-1.5", selected && "bg-primary")}
      onClick={onClick}
    >
      <AccountIcon className="text-xl" address={address} type={type} />
    </button>
  )
}

type AvatarTypeSelectProps = {
  className?: string
  selectedType: IdenticonType
  onChange: (type: IdenticonType) => void
}

export const AvatarTypeSelect: FC<AvatarTypeSelectProps> = ({
  className,
  selectedType,
  onChange,
}) => {
  const allAccounts = useAccounts()
  const address = useMemo(
    // fallbacks to a demo address picked from https://guide.kusama.network/docs/learn-accounts/#seed-generation
    () => allAccounts?.[0]?.address ?? "5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX",
    [allAccounts]
  )

  const handleSelect = useCallback(
    (type: IdenticonType) => () => {
      onChange(type)
    },
    [onChange]
  )

  return (
    <div className={cn("inline-flex gap-4", className)}>
      <AvatarOption
        address={address}
        type="talisman-orb"
        selected={selectedType === "talisman-orb"}
        onClick={handleSelect("talisman-orb")}
      />
      <AvatarOption
        address={address}
        type="polkadot-identicon"
        selected={selectedType === "polkadot-identicon"}
        onClick={handleSelect("polkadot-identicon")}
      />
    </div>
  )
}
