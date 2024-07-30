import { Combobox } from "@headlessui/react"
import { ChevronDownIcon, SearchIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"

import { NetworkOption } from "@ui/atoms"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { usePortfolio } from "@ui/domains/Portfolio/usePortfolio"

type NullableKeys<T> = {
  [P in keyof T]: T[P] | null
}

const filterItems =
  <T extends NullableKeys<Pick<NetworkOption, "name" | "symbols">>>(inputValue?: string) =>
  (bc: T | undefined) => {
    try {
      const test = inputValue?.toLowerCase() ?? ""
      return (
        !inputValue ||
        !!bc?.name?.toLowerCase?.().includes?.(test) ||
        !!bc?.symbols?.some?.((s) => s.toLowerCase().includes(test))
      )
    } catch (err) {
      // ignore
      return false
    }
  }

const ClearSearch: FC<{ open: boolean; setSearch: (val?: string) => void }> = ({
  open,
  setSearch,
}) => {
  useEffect(() => {
    if (!open) setSearch(undefined)
  }, [open, setSearch])
  return null
}

export const NetworkPicker: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const { networks, networkFilter, setNetworkFilter } = usePortfolio()

  return (
    <NetworkDropdown
      placeholder={t("All networks")}
      networks={networks}
      onChange={setNetworkFilter}
      value={networkFilter}
      className={className}
    />
  )
}

export const NetworkDropdown = <
  T extends Pick<NetworkOption, "id"> & NullableKeys<Pick<NetworkOption, "name" | "symbols">>
>({
  placeholder,
  networks,
  onChange,
  value,
  className,
}: {
  placeholder?: string
  networks: T[]
  onChange: (network?: T) => void
  value?: T
  className?: string
}) => {
  const { t } = useTranslation()

  // workaround nullable prop
  const handleOnChange = useCallback(
    (value: T | undefined | null) => onChange(value ?? undefined),
    [onChange]
  )

  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!ref) return

    setTimeout(() => {
      ref.current?.blur()
    }, 10)
  }, [value])

  const [search, setSearch] = useState<string>()
  const displayNetworks = useMemo(() => networks.filter(filterItems(search)), [networks, search])

  return (
    <div className={classNames("text-body-secondary group inline-block", className)}>
      <Combobox nullable value={value} onChange={handleOnChange}>
        {({ open }) => {
          return (
            <div className="relative h-24 overflow-visible">
              <ClearSearch open={open} setSearch={setSearch} />
              <div
                className={classNames(
                  "bg-field  focus-within:border-grey-700 relative flex h-24 w-full items-center gap-4 border  border-transparent px-6 text-base",
                  open ? "rounded-t-sm !border-b-transparent" : "rounded-sm"
                )}
              >
                <div className="flex w-12 justify-center">
                  {value ? (
                    <ChainLogo id={value.id} className="text-lg" />
                  ) : (
                    <SearchIcon className="text-md text-body-disabled" />
                  )}
                </div>
                <Combobox.Input
                  ref={ref}
                  className={classNames(
                    "h-full flex-grow bg-transparent",
                    value && "placeholder-body-secondary focus:placeholder-body-disabled"
                  )}
                  placeholder={value ? value.name ?? t("Unknown chain") : placeholder}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <div className="flex h-full w-12 flex-col justify-center">
                  {value ? (
                    <IconButton type="button" onClick={() => handleOnChange(undefined)}>
                      <XIcon />
                    </IconButton>
                  ) : (
                    <Combobox.Button className="hover:text-grey-300 text-lg">
                      <ChevronDownIcon className="" aria-hidden="true" />
                    </Combobox.Button>
                  )}
                </div>
              </div>
              <Combobox.Options className="scrollable scrollable-700 border-grey-700 bg-field absolute z-10 max-h-[30vh] w-full overflow-y-auto rounded-b-sm border border-t-0">
                {displayNetworks.map((network) => (
                  <Combobox.Option
                    key={network.id}
                    value={network}
                    className="hover:bg-grey-800 data-[headlessui-state=active]:bg-grey-800 data-[headlessui-state='active_selected']:bg-grey-800 focus:bg-grey-800 flex w-full cursor-pointer items-center gap-4 px-6 py-4"
                  >
                    <ChainLogo id={network.id} className="text-lg" />
                    <div>{network.name}</div>
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            </div>
          )
        }}
      </Combobox>
    </div>
  )
}
