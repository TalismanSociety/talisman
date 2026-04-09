import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { IconButton } from "@ui/components/IconButton"
import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInput } from "@ui/components/SearchInput"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { type FC, useCallback, useDeferredValue, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

export type ProtocolOption = {
  id: string
  name: string
  logoURI: string
}

const ProtocolOptionRow: FC<{
  option: ProtocolOption
  isSelected?: boolean
  onClick: () => void
}> = ({ option, isSelected, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-24 w-full items-center gap-6 overflow-hidden px-12 text-body-secondary hover:bg-grey-800 hover:text-body",
        "focus-visible:bg-grey-800",
        isSelected && "bg-grey-700!"
      )}
    >
      {!!option.logoURI && <AssetLogo url={option.logoURI} className="size-[2rem] shrink-0" />}
      <div className="flex grow truncate text-left text-body">{option.name}</div>
    </button>
  )
}

const ProtocolOptionsList: FC<{
  options: ProtocolOption[]
  selected: string
  onChange: (value: ProtocolOption) => void
}> = ({ options, selected, onChange }) => {
  const { t } = useTranslation()

  if (!options.length)
    return (
      <div className="flex h-24 w-full items-center px-12 text-body-inactive">
        {t("No protocols found")}
      </div>
    )

  return (
    <div>
      {options.map((option) => (
        <ProtocolOptionRow
          key={option.id}
          option={option}
          isSelected={option.id === selected}
          onClick={() => onChange(option)}
        />
      ))}
    </div>
  )
}

const ProtocolOptionsModalContent: FC<{
  options: ProtocolOption[]
  selected: string
  onChange: (option: ProtocolOption | null) => void
  onClose?: () => void
}> = ({ options, selected, onChange, onClose }) => {
  const { t } = useTranslation()

  const allOptions = useMemo<ProtocolOption[]>(
    () => [{ id: "", name: t("All Protocols"), logoURI: "" }, ...options],
    [options, t]
  )

  const handleChange = useCallback(
    (option: ProtocolOption) => {
      onChange(option.id === "" ? null : option)
    },
    [onChange]
  )

  const [rawSearch, setSearch] = useState("")
  const search = useDeferredValue(rawSearch)

  const filteredOptions = useMemo(() => {
    const lowerSearch = search.toLowerCase()
    return allOptions.filter((option) => option.name.toLowerCase().includes(lowerSearch))
  }, [allOptions, search])

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex w-full items-center px-8 pt-8">
        <IconButton className={cn("size-12 shrink-0", !IS_POPUP && "invisible")} onClick={onClose}>
          <ChevronLeftIcon />
        </IconButton>
        <div className="grow text-center text-secondary">{t("Protocol Filter")}</div>
        <IconButton className={cn("size-12 shrink-0", IS_POPUP && "invisible")} onClick={onClose}>
          <XIcon />
        </IconButton>
      </div>
      <div className="flex w-full shrink-0 items-center gap-8 px-12 py-8">
        <SearchInput onChange={setSearch} placeholder={t("Search by protocol name")} autoFocus />
      </div>
      <ScrollContainer className="scrollable h-full w-full grow overflow-x-hidden border-grey-700 border-t bg-black-secondary">
        <ProtocolOptionsList
          options={filteredOptions}
          selected={selected}
          onChange={handleChange}
        />
      </ScrollContainer>
    </div>
  )
}

export const ProtocolOptionsModal: FC<{
  isOpen?: boolean
  options: ProtocolOption[]
  selected: string
  onChange: (value: ProtocolOption | null) => void
  onClose: () => void
}> = ({ isOpen, options, selected, onChange, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onDismiss={onClose}
      className={cn(
        "h-150 w-100 overflow-hidden border-grey-800 bg-black",
        IS_POPUP ? "max-h-full max-w-full" : "rounded-lg border border-grey-800 shadow-xs"
      )}
      containerId={IS_POPUP ? "main" : undefined}
    >
      <ProtocolOptionsModalContent
        options={options}
        selected={selected}
        onChange={onChange}
        onClose={onClose}
      />
    </Modal>
  )
}
