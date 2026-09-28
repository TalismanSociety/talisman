import type { AccountsCatalogTree } from "@core/domains/accounts/helpers.catalog"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"
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
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <WizardModalDialog className="h-auto" title={t("Delete Folder")} onCloseClick={close}>
        {id !== null && name !== null && treeName !== null && (
          <DeleteFolder
            id={id}
            name={name}
            treeName={treeName}
            onConfirm={close}
            onCancel={close}
          />
        )}
      </WizardModalDialog>
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
