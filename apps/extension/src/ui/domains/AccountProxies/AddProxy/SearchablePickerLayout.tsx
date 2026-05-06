import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInput } from "@ui/components/SearchInput"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { useOpenCloseStatus } from "@ui/hooks/useOpenCloseStatus"
import { type FC, type ReactNode, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

type SearchablePickerLayoutProps = {
  isOpen: boolean
  containerId: string
  title: string
  searchPlaceholder?: string
  onDismiss: () => void
  children: (search: string) => ReactNode
}

/**
 * Shared layout for picker modals (network, account, delegate, proxy type).
 * Handles modal wrapper, search state, autofocus, and scroll container.
 */
export const SearchablePickerLayout: FC<SearchablePickerLayoutProps> = ({
  isOpen,
  containerId,
  title,
  searchPlaceholder,
  onDismiss,
  children,
}) => {
  return (
    <Modal containerId={containerId} isOpen={isOpen} onDismiss={onDismiss}>
      <SearchablePickerContent
        title={title}
        searchPlaceholder={searchPlaceholder}
        onDismiss={onDismiss}
      >
        {children}
      </SearchablePickerContent>
    </Modal>
  )
}

const SearchablePickerContent: FC<{
  title: string
  searchPlaceholder?: string
  onDismiss: () => void
  children: (search: string) => ReactNode
}> = ({ title, searchPlaceholder, onDismiss, children }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const refSearchInput = useRef<HTMLInputElement>(null)
  const status = useOpenCloseStatus()

  useEffect(() => {
    if (status === "open") refSearchInput.current?.focus()
  }, [status])

  return (
    <WizardModalDialog
      className="border-none"
      contentClassName="p-0!"
      title={title}
      onBackClick={onDismiss}
    >
      <div className="flex size-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput
            ref={refSearchInput}
            onChange={setSearch}
            placeholder={searchPlaceholder ?? t("Search")}
          />
        </div>
        <ScrollContainer className="scrollable grow border-grey-700 border-t bg-black-secondary">
          {children(search)}
        </ScrollContainer>
      </div>
    </WizardModalDialog>
  )
}
