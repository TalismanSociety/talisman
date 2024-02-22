import { Combobox } from "@headlessui/react"
import { ChevronDownIcon, SearchIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { NetworkOption, usePortfolio } from "@ui/domains/Portfolio/usePortfolio"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"

const filterItems = (inputValue?: string) => (bc: NetworkOption | undefined) => {
  try {
    const test = inputValue?.toLowerCase() ?? ""
    return (
      !inputValue ||
      !!bc?.name.toLowerCase().includes(test) ||
      !!bc?.symbols?.some((s) => s.toLowerCase().includes(test))
    )
  } catch (err) {
    // ignore
    return false
  }
}

export const NetworkPicker = () => {
  const { t } = useTranslation()
  const { networks, networkFilter, setNetworkFilter } = usePortfolio()
  const [search, setSearch] = useState<string>()
  const ref = useRef<HTMLInputElement>(null)

  // clear filter if user types something
  useEffect(() => {
    setNetworkFilter(undefined)
  }, [search, setNetworkFilter])

  // workaround nullable prop
  const handleOnChange = useCallback(
    (value: NetworkOption | undefined | null) => {
      setNetworkFilter(value ?? undefined)
    },
    [setNetworkFilter]
  )

  useEffect(() => {
    if (networkFilter)
      setTimeout(() => {
        ref.current?.blur()
      }, 10)
  }, [networkFilter])

  const displayNetworks = useMemo(() => networks.filter(filterItems(search)), [networks, search])

  return (
    <div className="text-body-secondary group inline-block">
      <Combobox nullable value={networkFilter} onChange={handleOnChange}>
        {({ open }) => (
          <div className="relative h-24 overflow-visible">
            <div
              className={classNames(
                "bg-field  focus-within:border-grey-700 relative flex h-24 w-full items-center gap-4 border  border-transparent px-6 text-base",
                open ? "rounded-t-sm !border-b-transparent" : "rounded-sm"
              )}
            >
              <div className="flex w-12 justify-center">
                {networkFilter ? (
                  <ChainLogo id={networkFilter.id} className="text-lg" />
                ) : (
                  <SearchIcon className="text-md text-body-disabled" />
                )}
              </div>
              <Combobox.Input
                ref={ref}
                className={classNames(
                  "h-full flex-grow bg-transparent",
                  networkFilter && "placeholder-body-secondary focus:placeholder-body-disabled"
                )}
                placeholder={networkFilter ? networkFilter.name : t("All networks")}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="flex h-full w-12 flex-col justify-center">
                {networkFilter ? (
                  <IconButton type="button" onClick={() => setNetworkFilter(undefined)}>
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
        )}
      </Combobox>
    </div>
  )
}
