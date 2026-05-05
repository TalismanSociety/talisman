import type { ProxyTypeInfo } from "@core/domains/accountProxies/getProxyTypes"
import { CheckmarkIcon } from "@talismn/icons"
import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInput } from "@ui/components/SearchInput"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { useOpenCloseStatus } from "@ui/hooks/useOpenCloseStatus"
import { cn } from "@ui/util/cn"
import { type FC, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

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
  return (
    <Modal containerId={containerId} isOpen={isOpen} onDismiss={onDismiss}>
      <ProxyTypePickerContent
        proxyTypes={proxyTypes}
        selectedProxyType={selectedProxyType}
        onSelect={onSelect}
        onDismiss={onDismiss}
      />
    </Modal>
  )
}

const ProxyTypePickerContent: FC<{
  proxyTypes: ProxyTypeInfo[]
  selectedProxyType: string
  onSelect: (proxyType: string) => void
  onDismiss: () => void
}> = ({ proxyTypes: allProxyTypes, selectedProxyType, onSelect, onDismiss }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const refSearchInput = useRef<HTMLInputElement>(null)
  const status = useOpenCloseStatus()
  useEffect(() => {
    if (status === "open") refSearchInput.current?.focus()
  }, [status])

  const proxyTypes = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase()
    if (!lowerSearch) return allProxyTypes
    return allProxyTypes.filter(
      (pt) =>
        pt.name.toLowerCase().includes(lowerSearch) || pt.docs.toLowerCase().includes(lowerSearch)
    )
  }, [allProxyTypes, search])

  return (
    <WizardModalDialog
      className="border-none"
      contentClassName="p-0!"
      title={t("Select Proxy Type")}
      onBackClick={onDismiss}
    >
      <div className="flex size-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput
            ref={refSearchInput}
            onChange={setSearch}
            placeholder={t("Search by name")}
          />
        </div>
        <ScrollContainer className="scrollable grow border-grey-700 border-t bg-black-secondary">
          {proxyTypes.map((pt) => (
            <ProxyTypeRow
              key={pt.name}
              proxyType={pt}
              selected={pt.name === selectedProxyType}
              onClick={() => {
                onSelect(pt.name)
                onDismiss()
              }}
            />
          ))}
          {proxyTypes.length === 0 && (
            <div className="p-16 text-center text-body-secondary">
              {t("No proxy types available")}
            </div>
          )}
        </ScrollContainer>
      </div>
    </WizardModalDialog>
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
