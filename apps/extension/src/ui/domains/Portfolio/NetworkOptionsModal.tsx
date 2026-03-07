import { ScrollContainer, useScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { IconButton } from "@ui/components/IconButton"
import { Modal } from "@ui/components/Modal"
import type { NetworkOption } from "@ui/state/portfolio"
import { IS_POPUP } from "@ui/util/constants"
import { type FC, useCallback, useDeferredValue, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { NetworkLogo } from "../Networks/NetworkLogo"

const NetworkOptionRow: FC<{
  option: NetworkOption
  isSelected?: boolean
  onClick: () => void
}> = ({ option, isSelected, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "flex h-24 w-full items-center gap-6 overflow-hidden px-12 text-body-secondary hover:bg-grey-800 hover:text-body",
        "focus-visible:bg-grey-800",
        isSelected && "!bg-grey-700"
      )}
    >
      <NetworkLogo networkId={option.networkIds[0]} className="shrink-0 text-xl" />
      <div className="flex grow flex-col gap-2 truncate text-left text-body">{option.name}</div>
    </button>
  )
}

const NetworkOptionsList: FC<{
  options: NetworkOption[]
  selected: NetworkOption | null
  onChange: (value: NetworkOption) => void
}> = ({ options, selected, onChange }) => {
  const { t } = useTranslation()
  const { ref: refContainer } = useScrollContainer()
  const ref = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: options.length,
    estimateSize: () => 48,
    overscan: 5,
    getScrollElement: () => refContainer.current,
  })

  if (!options.length)
    return (
      <div className="flex h-24 w-full items-center px-12 text-body-inactive">
        {t("No networks found")}
      </div>
    )

  return (
    <div ref={ref}>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const option = options[item.index]
          if (!option) return null

          return (
            <div
              key={item.key}
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <NetworkOptionRow
                key={item.key}
                option={option}
                isSelected={option.id === selected?.id}
                onClick={() => onChange(option)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const NetworkOptionsModalContent: FC<{
  options: NetworkOption[]
  selected: NetworkOption | null
  onChange: (NetworkOption: NetworkOption | null) => void
  onClose?: () => void
}> = ({ options, selected, onChange, onClose }) => {
  const { t } = useTranslation()

  // freeze order on first render so it doesnt change when selecting an option
  const [allOptions] = useState<NetworkOption[]>(() => [
    {
      id: "ALL_NETWORKS",
      name: t("All Networks"),
      networkIds: [],
    },
    ...options,
  ])

  const handleChange = useCallback(
    (option: NetworkOption) => {
      onChange(option.id === "ALL_NETWORKS" ? null : option)
    },
    [onChange]
  )

  const [rawSearch, setSearch] = useState<string>("")
  const search = useDeferredValue(rawSearch)

  const filteredNetworks = useMemo(() => {
    const lowerSearch = search.toLowerCase()
    return allOptions.filter((network) => network.name.toLowerCase().includes(lowerSearch))
  }, [allOptions, search])

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex w-full items-center px-8 pt-8">
        <IconButton
          className={classNames("size-12 shrink-0", !IS_POPUP && "invisible")}
          onClick={onClose}
        >
          <ChevronLeftIcon />
        </IconButton>
        <div className="grow text-center text-secondary">{t("Network Filter")}</div>
        <IconButton
          className={classNames("size-12 shrink-0", IS_POPUP && "invisible")}
          onClick={onClose}
        >
          <XIcon />
        </IconButton>
      </div>
      <div className="flex w-full shrink-0 items-center gap-8 px-12 py-8">
        <SearchInput onChange={setSearch} placeholder={t("Search by network name")} autoFocus />
      </div>
      <ScrollContainer className="scrollable h-full w-full grow overflow-x-hidden border-grey-700 border-t bg-black-secondary">
        <NetworkOptionsList
          options={filteredNetworks}
          selected={selected}
          onChange={handleChange}
        />
      </ScrollContainer>
    </div>
  )
}

export const NetworkOptionsModal: FC<{
  isOpen?: boolean
  options: NetworkOption[]
  selected: NetworkOption | null
  containerId?: string
  onChange: (value: NetworkOption | null) => void
  onClose: () => void
}> = ({ isOpen, options, selected, containerId, onChange, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onDismiss={onClose}
      className={classNames(
        "h-[60rem] w-[40rem] overflow-hidden border-grey-800 bg-black",
        IS_POPUP ? "max-h-full max-w-full" : "rounded-lg border shadow"
      )}
      containerId={containerId ?? (IS_POPUP ? "main" : undefined)}
    >
      <NetworkOptionsModalContent
        options={options}
        selected={selected}
        onChange={onChange}
        onClose={onClose}
      />
    </Modal>
  )
}
