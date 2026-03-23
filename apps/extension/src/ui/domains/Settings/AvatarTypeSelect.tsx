import type { IdenticonType } from "@core/domains/accounts/types"
import type { Address } from "@core/types/base"
import { cn } from "@ui/util/cn"
import { type FC, useCallback } from "react"

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

const TEST_ADDRESS = "5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX"

export const AvatarTypeSelect: FC<AvatarTypeSelectProps> = ({
  className,
  selectedType,
  onChange,
}) => {
  const handleSelect = useCallback(
    (type: IdenticonType) => () => {
      onChange(type)
    },
    [onChange]
  )

  return (
    <div className={cn("inline-flex gap-4", className)}>
      <AvatarOption
        address={TEST_ADDRESS}
        type="talisman-orb"
        selected={selectedType === "talisman-orb"}
        onClick={handleSelect("talisman-orb")}
      />
      <AvatarOption
        address={TEST_ADDRESS}
        type="polkadot-identicon"
        selected={selectedType === "polkadot-identicon"}
        onClick={handleSelect("polkadot-identicon")}
      />
    </div>
  )
}
