import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react"
import type { Network, NetworkId } from "@talismn/chaindata-provider"
import { ChevronDownIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useNetworkDisplayNamesMapById } from "@ui/state/networks"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { NetworkLogo } from "./NetworkLogo"
import { NetworkName } from "./NetworkName"

export type NetworkComboBoxOption = Pick<Network, "id" | "name" | "logo">

export const NetworkCombo: FC<{
  networks: NetworkComboBoxOption[]
  value: NetworkId | null
  placeholder?: string
  className?: string
  bgClassName?: string
  onChange: (networkId: NetworkId | null) => void
}> = ({ networks, value, placeholder, onChange, className, bgClassName = "bg-field" }) => {
  const { t } = useTranslation()
  const networkNameById = useNetworkDisplayNamesMapById()

  const [search, setSearch] = useState("")

  const searchResults = useMemo(() => {
    if (!search) return networks
    const lowerSearch = search.toLowerCase()
    return networks.filter((item) => item.name.toLowerCase().includes(lowerSearch))
  }, [networks, search])

  const selected = useMemo(() => {
    return networks.find((network) => network.id === value) ?? null
  }, [networks, value])

  return (
    <Combobox
      immediate
      onChange={(n) => onChange(n?.id ?? null)}
      value={selected}
      virtual={{ options: searchResults }}
      onClose={() => setSearch("")}
    >
      {({ open }) => (
        <div className={classNames("relative")}>
          <div
            className={classNames(
              "flex h-24 items-center gap-4 px-8",
              "w-full",
              "rounded-sm border border-transparent focus-within:border-grey-600",
              open && "rounded-b-none border-b-transparent",
              className,
              bgClassName
            )}
          >
            <NetworkLogo
              networkId={value ?? undefined}
              className={classNames("size-12", !selected && "opacity-50")}
            />
            <ComboboxInput
              placeholder={placeholder ?? t("Select network")}
              displayValue={(n: Network) => networkNameById[n?.id ?? ""] ?? ""}
              className={classNames(
                "h-full grow bg-transparent text-grey-300 placeholder:text-body-disabled focus:text-body"
              )}
              onChange={(e) => setSearch(e.target.value)}
            />
            {!open && (!!search || selected) ? (
              <button type="button" className="group" onClick={() => onChange(null)}>
                <XIcon className="size-12 text-body-secondary group-hover:text-body" />
              </button>
            ) : (
              <ComboboxButton className="group">
                <ChevronDownIcon className="size-12 text-body-secondary group-hover:text-body" />
              </ComboboxButton>
            )}
          </div>
          <ComboboxOptions
            className={classNames(
              "overflow-x-none absolute top-24 z-10 max-h-70 min-h-10 w-full overflow-y-scroll rounded-b pb-0 empty:invisible",
              "border border-grey-600",
              bgClassName
            )}
          >
            {({ option }) => (
              <ComboboxOption
                key={option.id}
                value={option}
                className={classNames(
                  `relative flex h-24 w-full items-center gap-4 px-8 text-body-secondary hover:bg-grey-750 data-focus:bg-grey-750 data-selected:bg-grey-700 data-selected:text-body`
                )}
              >
                <NetworkLogo networkId={option.id} className="size-12" />
                <NetworkName networkId={option.id} className="text-base" />
              </ComboboxOption>
            )}
          </ComboboxOptions>
        </div>
      )}
    </Combobox>
  )
}
