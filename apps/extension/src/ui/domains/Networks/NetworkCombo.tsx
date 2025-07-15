import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react"
import { Network, NetworkId } from "@talismn/chaindata-provider"
import { ChevronDownIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { useNetworkDisplayNamesMapById } from "@ui/state/networks"

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
              "focus-within:border-grey-600 rounded-sm border border-transparent",
              open && "rounded-b-none border-b-transparent",
              className,
              bgClassName,
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
                "placeholder:text-body-disabled text-grey-300 focus:text-body h-full grow bg-transparent",
              )}
              onChange={(e) => setSearch(e.target.value)}
            />
            {!open && (!!search || selected) ? (
              <button type="button" className="group" onClick={() => onChange(null)}>
                <XIcon className="group-hover:text-body text-body-secondary size-12" />
              </button>
            ) : (
              <ComboboxButton className="group">
                <ChevronDownIcon className="group-hover:text-body text-body-secondary size-12" />
              </ComboboxButton>
            )}
          </div>
          <ComboboxOptions
            className={classNames(
              "overflow-x-none absolute top-24 z-10 max-h-[28rem] min-h-10 w-full overflow-y-scroll rounded-b pb-0 empty:invisible",
              "border-grey-600 border",
              bgClassName,
            )}
          >
            {({ option }) => (
              <ComboboxOption
                key={option.id}
                value={option}
                className={classNames(
                  `text-body-secondary [&[data-selected]]:text-body [&[data-selected]]:bg-grey-700 [&[data-focus]]:bg-grey-750 hover:bg-grey-750 relative flex h-24 w-full items-center gap-4 px-8`,
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
