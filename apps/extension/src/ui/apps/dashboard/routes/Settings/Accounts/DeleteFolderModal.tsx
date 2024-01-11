import { AccountsCatalogTree } from "@core/domains/accounts/helpers.catalog"
import { api } from "@ui/api"
import { useCallback, useEffect } from "react"
import { Trans, useTranslation } from "react-i18next"
import { atom, useRecoilState } from "recoil"
import { Button, Modal, ModalDialog } from "talisman-ui"

const deleteFolderModalOpenState = atom<boolean>({
  key: "deleteFolderModalOpenState",
  default: false,
})
const deleteFolderItemState = atom<{
  id: string | null
  name: string | null
  treeName: AccountsCatalogTree | null
}>({
  key: "deleteFolderItemState",
  default: { id: null, name: null, treeName: null },
})

export const useDeleteFolderModal = () => {
  const [{ id, name, treeName }, setFolderItem] = useRecoilState(deleteFolderItemState)
  const [isOpen, setIsOpen] = useRecoilState(deleteFolderModalOpenState)

  const open = useCallback(
    (id: string, name: string, treeName: AccountsCatalogTree) => {
      setFolderItem({ id, name, treeName })
      setIsOpen(true)
    },
    [setFolderItem, setIsOpen]
  )
  const close = useCallback(() => setIsOpen(false), [setIsOpen])

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
    await api.accountsCatalogRunActions([{ type: "removeFolder", tree: treeName, id }])
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
