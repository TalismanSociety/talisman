import { track } from "@ui/api/track"
import type { ValidatorSortValue } from "@ui/domains/Staking/Bittensor/utils/validatorSorting"

import type { BondOption } from "../hooks/types"
import { ROOT_NETUID } from "./constants"

export const trackValidatorSelected = ({
  hotkey,
  validators,
  netuid,
  defaultHotkey,
  sort,
  searched,
}: {
  hotkey: string
  validators: readonly BondOption[] | undefined
  netuid: number
  defaultHotkey: string | undefined
  sort: ValidatorSortValue
  searched: boolean
}) => {
  const index = validators?.findIndex((validator) => validator.hotkey === hotkey) ?? -1
  track("staking_validator_selected", {
    is_default: defaultHotkey === hotkey,
    is_featured: !!validators?.[index]?.isFeatured,
    is_root: netuid === ROOT_NETUID,
    sort,
    searched,
    position: index + 1,
  })
}
