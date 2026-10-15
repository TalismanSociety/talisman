import type { AccountsCatalogTree } from "@core/domains/accounts/helpers.catalog"
import { api } from "@ui/api"
import { track } from "@ui/api/track"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"
import { useAccountsCatalog } from "@ui/state/accounts"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"

type FolderProps = {
  id: string
  name: string
  treeName: AccountsCatalogTree
}

const [useDeleteFolderOpenClose] = createGlobalOpenClose<FolderProps>()

export const useDeleteFolderModal = () => {
  const { isOpen, open: _open, close, args } = useDeleteFolderOpenClose()
  const { id = null, name = null, treeName = null } = args ?? {}

  const open = useCallback(
    (id: string, name: string, treeName: AccountsCatalogTree) => _open({ id, name, treeName }),
    [_open]
  )

  return {
    id,
    name,
    treeName,
    isOpen,
    open,
    close,
  }
}

export const DeleteFolderModal = () => {
  const { t } = useTranslation()
  const { id, name, treeName, close, isOpen } = useDeleteFolderModal()

  return (
    <Modal analyticsId="delete_folder" containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog className="h-auto" title={t("Delete Folder")} onCloseClick={close}>
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
  const { t } = useTranslation()
  const catalog = useAccountsCatalog()
  const handleDeleteClick = useCallback(async () => {
    const folder = catalog[treeName].find((item) => item.type === "folder" && item.id === id)
    await api.accountsCatalogRunActions([{ type: "removeFolder", tree: treeName, id }])
    track("folder_deleted", {
      accounts_in_folder: folder?.type === "folder" ? folder.tree.length : 0,
    })
    onConfirm()
  }, [catalog, id, onConfirm, treeName])

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
