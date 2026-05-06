import type { ProxyTypeInfo } from "@core/domains/accountProxies/getProxyTypes"
import { CheckmarkIcon } from "@talismn/icons"
import { cn } from "@ui/util/cn"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { SearchablePickerLayout } from "./SearchablePickerLayout"

type ProxyTypePickerProps = {
  isOpen: boolean
  containerId: string
  proxyTypes: ProxyTypeInfo[]
  selectedProxyType: string
  onSelect: (proxyType: string) => void
  onDismiss: () => void
}

export const ProxyTypePicker: FC<ProxyTypePickerProps> = ({
  isOpen,
  containerId,
  proxyTypes,
  selectedProxyType,
  onSelect,
  onDismiss,
}) => {
  const { t } = useTranslation()

  return (
    <SearchablePickerLayout
      isOpen={isOpen}
      containerId={containerId}
      title={t("Select Proxy Type")}
      searchPlaceholder={t("Search by name")}
      onDismiss={onDismiss}
    >
      {(search) => (
        <ProxyTypeList
          proxyTypes={proxyTypes}
          search={search}
          selectedProxyType={selectedProxyType}
          onSelect={(type) => {
            onSelect(type)
            onDismiss()
          }}
        />
      )}
    </SearchablePickerLayout>
  )
}

const ProxyTypeList: FC<{
  proxyTypes: ProxyTypeInfo[]
  search: string
  selectedProxyType: string
  onSelect: (proxyType: string) => void
}> = ({ proxyTypes: allProxyTypes, search, selectedProxyType, onSelect }) => {
  const { t } = useTranslation()

  const proxyTypes = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase()
    if (!lowerSearch) return allProxyTypes
    return allProxyTypes.filter(
      (pt) =>
        pt.name.toLowerCase().includes(lowerSearch) || pt.docs.toLowerCase().includes(lowerSearch)
    )
  }, [allProxyTypes, search])

  return (
    <>
      {proxyTypes.map((pt) => (
        <ProxyTypeRow
          key={pt.name}
          proxyType={pt}
          selected={pt.name === selectedProxyType}
          onClick={() => onSelect(pt.name)}
        />
      ))}
      {proxyTypes.length === 0 && (
        <div className="p-16 text-center text-body-secondary">{t("No proxy types available")}</div>
      )}
    </>
  )
}

const ProxyTypeRow: FC<{
  proxyType: ProxyTypeInfo
  selected?: boolean
  onClick: () => void
}> = ({ proxyType, selected, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-6 overflow-hidden px-12 py-8 text-body-secondary hover:bg-grey-800 hover:text-body",
        "focus-visible:bg-grey-800",
        selected && "bg-grey-700!"
      )}
    >
      <div className="flex grow flex-col gap-1 overflow-hidden text-left">
        <div className="truncate text-body">{proxyType.name}</div>
        {!!proxyType.docs && (
          <div className="line-clamp-2 text-body-secondary text-xs leading-paragraph">
            {proxyType.docs}
          </div>
        )}
      </div>
      {selected && (
        <div className="flex size-12 shrink-0 items-center justify-center">
          <CheckmarkIcon className="size-10" />
        </div>
      )}
    </button>
  )
}
