import { AccountsCatalogTree } from "@core/domains/accounts/types"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useCallback, useEffect, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Modal, ModalDialog } from "talisman-ui"

const useDeleteFolderModalProvider = () => {
  const [id, setId] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [treeName, setTreeName] = useState<AccountsCatalogTree | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback((id: string, name: string, treeName: AccountsCatalogTree) => {
    setId(id)
    setName(name)
    setTreeName(treeName)
    setIsOpen(true)
  }, [])
  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    close()
  }, [close])

  return {
    id,
    name,
    treeName,
    isOpen,
    open,
    close,
  }
}

export const [DeleteFolderModalProvider, useDeleteFolderModal] = provideContext(
  useDeleteFolderModalProvider
)

export const DeleteFolderModal = () => {
  const { t } = useTranslation("admin")
  const { id, name, treeName, close, isOpen } = useDeleteFolderModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("Delete Folder")} onClose={close}>
        {id !== null && name !== null && treeName !== null && (
          <DeleteFolder
            id={id}
            name={name}
            treeName={treeName}
            onConfirm={close}
            onCancel={close}
          />
        )}
      </ModalDialog>
    </Modal>
  )
}

interface DeleteFolderProps {
  id: string
  name: string
  treeName: AccountsCatalogTree
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

const DeleteFolder = ({
  id,
  name,
  treeName,
  onConfirm,
  onCancel,
  className,
}: DeleteFolderProps) => {
  const { t } = useTranslation("admin")
  const handleDeleteClick = useCallback(async () => {
    await api.accountsCatalogMutate([
      {
        type: "removeFolder",
        tree: treeName,
        id,
      },
    ])
    onConfirm()
  }, [id, onConfirm, treeName])

  return (
    <div className={className}>
      <p className="text-body-secondary text-sm">
        <Trans
          t={t}
          defaults="Confirm to delete folder <Highlight>{{name}}</Highlight>."
          components={{ Highlight: <span className="text-body" /> }}
          values={{ name }}
        />
      </p>
      <div className="mt-8 grid grid-cols-2 gap-8">
        <Button type="button" onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button primary onClick={handleDeleteClick}>
          {t("Delete")}
        </Button>
      </div>
    </div>
  )
}
