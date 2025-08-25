import { ChevronLeftIcon, ProtocolIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { FC, useCallback, useDeferredValue, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { ScrollContainer, useScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { ProtocolOption, useDefiPositions } from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

const isAllProtocolsOption = (option: ProtocolOption) =>
  "id" in option && option.id === "ALL_PROTOCOLS"

const ProtocolOptionRow: FC<{
  option: ProtocolOption
  isSelected?: boolean
  onClick: () => void
}> = ({ option, isSelected, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "text-body-secondary hover:text-body hover:bg-grey-800 flex h-24 w-full items-center gap-6 overflow-hidden px-12",
        "focus-visible:bg-grey-800",
        isSelected && "!bg-grey-700",
      )}
    >
      {isAllProtocolsOption(option) ? (
        <ProtocolIcon className="size-16 shrink-0" />
      ) : (
        <AssetLogo url={option.logo} className="shrink-0 text-xl" />
      )}

      <div className="text-body grow flex-col gap-2 truncate text-left">{option.name}</div>
      <FiatFromUsd amount={option.valueUsd} isBalance noCountUp className="text-sm" />
    </button>
  )
}

const ProtocolOptionsList: FC<{
  options: ProtocolOption[]
  selected: ProtocolOption | null
  onChange: (value: ProtocolOption) => void
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
      <div className="text-body-inactive flex h-24 w-full items-center px-12">
        {t("No protocols found")}
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
              className="absolute left-0 top-0 w-full"
              style={{
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <ProtocolOptionRow
                key={item.key}
                option={option}
                isSelected={option.name === selected?.name}
                onClick={() => onChange(option)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ProtocolOptionsModalContent: FC<{
  options: ProtocolOption[]
  selected: ProtocolOption | null
  onChange: (ProtocolOption: ProtocolOption | null) => void
  onClose?: () => void
}> = ({ options, selected, onChange, onClose }) => {
  const { t } = useTranslation()

  //const total = useMemo(() => options.reduce((sum, p) => sum + (p.valueUsd || 0), 0), [options])
  const { data: positions = [] } = useDefiPositions()
  const totalValue = useMemo(
    () =>
      positions.reduce(
        (total, position) =>
          total + position.breakdown.reduce((sum, item) => sum + item.valueUsd, 0),
        0,
      ),
    [positions],
  )

  // freeze order on first render so it doesnt change when selecting an option
  const [allOptions] = useState<ProtocolOption[]>(() => [
    {
      id: "ALL_PROTOCOLS",
      name: t("All Protocols"),
      logo: null,
      valueUsd: totalValue,
    },
    ...options,
  ])

  const handleChange = useCallback(
    (option: ProtocolOption) => {
      onChange(isAllProtocolsOption(option) ? null : option)
    },
    [onChange],
  )

  const [rawSearch, setSearch] = useState<string>("")
  const search = useDeferredValue(rawSearch)

  const filteredProtocols = useMemo(() => {
    const lowerSearch = search.toLowerCase()
    return allOptions.filter((protocol) => protocol.name.toLowerCase().includes(lowerSearch))
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
        <div className="text-secondary grow text-center">{t("Protocol Filter")}</div>
        <IconButton
          className={classNames("size-12 shrink-0", IS_POPUP && "invisible")}
          onClick={onClose}
        >
          <XIcon />
        </IconButton>
      </div>
      <div className="flex w-full shrink-0 items-center gap-8 px-12 py-8">
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <SearchInput onChange={setSearch} placeholder={t("Search by name")} autoFocus />
      </div>
      <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
        <ProtocolOptionsList
          options={filteredProtocols}
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
  selected: ProtocolOption | null
  containerId?: string
  onChange: (value: ProtocolOption | null) => void
  onClose: () => void
}> = ({ isOpen, options, selected, containerId, onChange, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onDismiss={onClose}
      className={classNames(
        "border-grey-800 h-[60rem] w-[40rem] overflow-hidden bg-black",
        IS_POPUP ? "max-h-full max-w-full" : "rounded-lg border shadow",
      )}
      containerId={containerId ?? (IS_POPUP ? "main" : undefined)}
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
