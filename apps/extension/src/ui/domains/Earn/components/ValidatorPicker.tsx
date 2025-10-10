import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { ValidatorDto } from "extension-core"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { SearchInput } from "@talisman/components/SearchInput"
import { IS_POPUP } from "@ui/util/constants"

import { useYieldValidators } from "../hooks/useYieldValidators"
import { ValidatorItem } from "./ValidatorItem"

type SortMethod = "name" | "tvl" | "rewardRate" | "nominatorCount"

interface ValidatorPickerProps {
  isOpen: boolean
  yieldId: string
  onDismiss: () => void
  onSelect: (validator: ValidatorDto) => void
}

export const ValidatorPicker: FC<ValidatorPickerProps> = ({
  isOpen,
  yieldId,
  onDismiss,
  onSelect,
}) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [sortMethod, setSortMethod] = useState<SortMethod>("tvl")

  // Use the custom hook to fetch validators
  const { validators, isLoading, error } = useYieldValidators(yieldId)

  // Sort and filter validators
  const filteredValidators = useMemo(() => {
    const filtered = validators.filter((validator) => {
      // Filter by search term
      const matchesSearch = validator?.name?.toLowerCase().includes(search.toLowerCase())

      // Filter out inactive validators based on status
      const isActive =
        !validator?.status ||
        validator.status.toLowerCase() === "active" ||
        validator.status.toLowerCase() === "bonded" ||
        validator.status.toLowerCase() === "validating"

      return matchesSearch && isActive
    })

    // Sort validators
    filtered.sort((a, b) => {
      switch (sortMethod) {
        case "name":
          return a.name?.localeCompare(b.name ?? "") ?? 0
        case "tvl":
          return parseFloat(b.tvl || "0") - parseFloat(a.tvl || "0")
        case "rewardRate":
          return (b.rewardRate?.total || 0) - (a.rewardRate?.total || 0)
        case "nominatorCount":
          return (b.nominatorCount || 0) - (a.nominatorCount || 0)
        default:
          return 0
      }
    })

    return filtered
  }, [validators, search, sortMethod])

  const handleSelect = useCallback(
    (validator: ValidatorDto) => {
      onSelect(validator)
      // Don't call onDismiss here - let the parent handle closing after onSelect
    },
    [onSelect],
  )

  const content = (
    <>
      <header className="flex w-full items-center justify-between gap-8 overflow-hidden p-10">
        <IconButton onClick={onDismiss}>
          <ChevronLeftIcon />
        </IconButton>
        <div className="text-base font-bold">{t("Select Validator")}</div>
        <IconButton onClick={onDismiss} className="invisible">
          <XIcon />
        </IconButton>
      </header>

      <div className="grow overflow-hidden p-12 pt-0">
        {/* Search Input */}
        <div className="flex min-h-fit w-full items-center gap-8 pb-8">
          <SearchInput onChange={setSearch} placeholder={t("Search for validator name")} />
        </div>

        {/* Sort Pills */}
        <div className="flex w-full gap-4 overflow-x-auto pb-8">
          <button
            type="button"
            onClick={() => setSortMethod("tvl")}
            className={classNames(
              "shrink-0 rounded-full px-8 py-4 text-xs font-medium transition-colors",
              sortMethod === "tvl"
                ? "bg-white text-black"
                : "bg-grey-800 text-grey-400 hover:bg-grey-700",
            )}
          >
            TVL
          </button>
          <button
            type="button"
            onClick={() => setSortMethod("rewardRate")}
            className={classNames(
              "shrink-0 rounded-full px-8 py-4 text-xs font-medium transition-colors",
              sortMethod === "rewardRate"
                ? "bg-white text-black"
                : "bg-grey-800 text-grey-400 hover:bg-grey-700",
            )}
          >
            APR
          </button>
          <button
            type="button"
            onClick={() => setSortMethod("nominatorCount")}
            className={classNames(
              "shrink-0 rounded-full px-8 py-4 text-xs font-medium transition-colors",
              sortMethod === "nominatorCount"
                ? "bg-white text-black"
                : "bg-grey-800 text-grey-400 hover:bg-grey-700",
            )}
          >
            Stakers
          </button>
          <button
            type="button"
            onClick={() => setSortMethod("name")}
            className={classNames(
              "shrink-0 rounded-full px-8 py-4 text-xs font-medium transition-colors",
              sortMethod === "name"
                ? "bg-white text-black"
                : "bg-grey-800 text-grey-400 hover:bg-grey-700",
            )}
          >
            Name
          </button>
        </div>

        {/* Validators List */}
        <div className="flex h-full flex-col gap-8 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-grey-400">{t("Loading validators...")}</div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-red-400">{error?.message || "Failed to load validators"}</div>
            </div>
          ) : filteredValidators.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-grey-400">{t("No validators found")}</div>
            </div>
          ) : (
            filteredValidators.map((validator) => (
              <ValidatorItem
                key={validator.address}
                validator={validator}
                isSelected={false}
                onClick={() => handleSelect(validator)}
              />
            ))
          )}
        </div>
      </div>
    </>
  )

  if (IS_POPUP) {
    // In popup mode, this component should not be rendered as a modal
    // The popup mode should use the separate ValidatorPickerPage route instead
    return null
  }

  // Dashboard mode - render as modal
  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={onDismiss}>
      <div
        className={classNames(
          "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
          "border-grey-800 rounded border",
        )}
      >
        {content}
      </div>
    </Modal>
  )
}
