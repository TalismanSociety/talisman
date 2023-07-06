import { AccountsCatalogTree } from "@core/domains/accounts/types"
import Dialog from "@talisman/components/Dialog"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import styled from "styled-components"

const useDeleteFolderModalProvider = () => {
  const [name, setName] = useState<string | null>(null)
  const [treeName, setTreeName] = useState<AccountsCatalogTree | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback((name: string, treeName: AccountsCatalogTree) => {
    setName(name)
    setTreeName(treeName)
    setIsOpen(true)
  }, [])
  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    close()
  }, [close])

  return {
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
  const { name, treeName, close, isOpen } = useDeleteFolderModal()

  return (
    <Modal open={isOpen}>
      <ModalDialog title={t("Delete Folder")} onClose={close}>
        {name !== null && treeName !== null && (
          <DeleteFolder name={name} treeName={treeName} onConfirm={close} onCancel={close} />
        )}
      </ModalDialog>
    </Modal>
  )
}

const StyledDialog = styled(Dialog)`
  .error {
    font-size: var(--font-size-small);
    color: var(--color-status-warning);
    height: 1.6em;
    margin-bottom: -1.6em;
  }
`

interface DeleteFolderProps {
  name: string
  treeName: AccountsCatalogTree
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

const DeleteFolder = ({ name, treeName, onConfirm, onCancel, className }: DeleteFolderProps) => {
  const { t } = useTranslation("admin")
  const submit = useCallback(async () => {
    await api.accountsCatalogMutate([
      {
        type: "removeFolder",
        tree: treeName,
        name,
      },
    ])
    onConfirm()
  }, [name, onConfirm, treeName])

  return (
    <StyledDialog
      className={className}
      extra={<div>{t("Delete '{{name}}'?", { name })}</div>}
      confirmText={t("Delete")}
      cancelText={t("Cancel")}
      onConfirm={submit}
      onCancel={onCancel}
    />
  )
}
