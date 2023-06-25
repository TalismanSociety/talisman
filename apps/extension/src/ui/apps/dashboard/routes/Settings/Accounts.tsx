import {
  PortfolioStore,
  Tree,
  TreeAccount,
  TreeFolder,
  TreeItem,
} from "@core/domains/accounts/store.portfolio"
import { AccountJson, AccountJsonAny, RequestPortfolioMutate } from "@core/domains/accounts/types"
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  DraggableAttributes,
  KeyboardSensor,
  PointerSensor,
  UniqueIdentifier,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { WithTooltip } from "@talisman/components/Tooltip"
import {
  ChevronDownIcon,
  CornerDownRightIcon,
  DragIcon,
  FolderIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
} from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import Layout from "@ui/apps/dashboard/layout"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import Fiat from "@ui/domains/Asset/Fiat"
import useAccounts from "@ui/hooks/useAccounts"
import useAccountsPortfolio from "@ui/hooks/useAccountsPortfolio"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { forwardRef, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Accounts",
}

export const Accounts = () => {
  const { t } = useTranslation("admin")
  useAnalyticsPageView(ANALYTICS_PAGE)

  const accounts = useAccounts()
  const portfolio = useAccountsPortfolio()

  const test = () => {
    api.accountsPortfolioMutate([
      {
        type: "moveAccount",
        address: "5EHNsSHuWrNMYgx3bPhsRVLG77DX8sS8wZrnbtieJzbtSZr9",
        folder: "New folder 2",
        // beforeItem: {
        //   type: "account",
        //   address: "5CcU6DRpocLUWYJHuNLjB4gGyHJrkWuruQD5XFbRYffCfSAP",
        // },
      },
      {
        type: "moveAccount",
        address: "0x5d89da39290A439e024e597E9c0F0E902d3fD64E",
        folder: "New folder 2",
        // beforeItem: {
        //   type: "account",
        //   address: "5CcU6DRpocLUWYJHuNLjB4gGyHJrkWuruQD5XFbRYffCfSAP",
        // },
      },
      {
        type: "moveAccount",
        address: "0x3aE3199223732c2745dA671aDd5d0B834b6c3d86",
        folder: "New folder 2",
        // beforeItem: {
        //   type: "account",
        //   address: "5CcU6DRpocLUWYJHuNLjB4gGyHJrkWuruQD5XFbRYffCfSAP",
        // },
      },
    ])
  }

  return (
    <Layout analytics={ANALYTICS_PAGE} withBack centered backTo="/settings">
      <HeaderBlock
        title={t("Manage Accounts")}
        text={t("Select which accounts are shown on your portfolio")}
      />
      <div className="mb-16 mt-24 flex gap-4">
        <button
          type="button"
          className="bg-primary text-body-black hover:bg-primary/80 flex items-center gap-3 rounded-sm p-4 text-sm"
          onClick={() => {
            api.accountsPortfolioMutate([{ type: "addFolder", name: "New folder" }])
          }}
        >
          <FolderPlusIcon />
          Add new folder
        </button>

        <button
          type="button"
          className="bg-primary text-body-black hover:bg-primary/80 flex items-center gap-3 rounded-sm p-4 text-sm"
          onClick={test}
        >
          Test
        </button>
      </div>
      <AccountsList accounts={accounts} portfolio={portfolio} />
      {/* <button
        type="button"
        className="bg-primary text-body-black hover:bg-primary/80 flex items-center gap-3 rounded-sm p-4 text-sm"
        onClick={open}
      >
        {t("Reset to defaults")}
      </button>
      <Modal open={isOpen && !!network} onClose={close}>
        <ModalDialog title={t("Reset Network")} onClose={close}>
          <div className="text-body-secondary mt-4 space-y-16">
            <div className="text-base">
              <Trans t={t}>
                Network <span className="text-body">{networkName}</span> will be reset to Talisman's
                default settings.
              </Trans>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <Button onClick={close}>{t("Cancel")}</Button>
              <Button primary onClick={handleConfirmReset}>
                {t("Reset")}
              </Button>
            </div>
          </div>
        </ModalDialog>
      </Modal> */}
    </Layout>
  )
}

const AccountsList = ({ accounts, portfolio }: { accounts: AccountJson[]; portfolio: Tree }) => {
  const rootId = "__DNDKIT-SORTABLE-CONTEXT-ROOT"
  const { setNodeRef: setDroppableNodeRef } = useDroppable({ id: rootId })

  const [tree, setTree] = useState(portfolio)
  useEffect(() => {
    console.log("update tree", portfolio)
    setTree(portfolio)
  }, [portfolio])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null)
  const itemsById = useMemo(() => byId(withIds(flattenTree(tree))), [tree])
  const allItems = useMemo(() => Object.values(itemsById), [itemsById])
  const rootItems = useMemo(() => withIds(tree), [tree])

  const handleDragStart = useCallback((event: DragStartEvent) => setActiveId(event.active.id), [])
  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setActiveContainerId(null)
  }, [])
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const activeContainerId = event.over?.data.current?.sortable.containerId
      console.log("activeContainerId", activeContainerId)
      setActiveContainerId(activeContainerId)

      const activeItem = activeId ? itemsById[activeId] : null
      if (
        activeItem?.type === "account" &&
        ((activeItem.folder === undefined && activeContainerId !== rootId) ||
          activeItem.folder !== activeContainerId)
      )
        setTree((tree) => {
          const newTree = tree.slice()
          console.log(
            "activeContainerId",
            activeContainerId,
            "folder",
            activeContainerId === rootId ? undefined : activeContainerId
          )
          PortfolioStore.mutateTree(newTree, [
            {
              type: "moveAccount",
              address: activeItem.address,
              folder: activeContainerId === rootId ? undefined : activeContainerId,
            },
          ])
          return newTree
        })
    },
    [activeId, itemsById]
  )
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      setActiveContainerId(null)

      const { active, over, delta } = event
      console.log("event", event)
      if (active.id === over?.id) return

      const activeContainer = active.data.current?.sortable.containerId
      const overContainer =
        activeContainerId || over?.data.current?.sortable.containerId || over?.id
      const folder = (itemsById[`folder-${overContainer}`] as TreeFolder) ?? null

      const activeItem = itemsById[active.id]
      let overItem = over?.id ? itemsById[over?.id] ?? null : null
      if (delta.y > 0) {
        const currentFolderFilter = folder
          ? (item: TreeFolder | TreeAccountWithFolder) =>
              item.type === "account" && item.folder === folder.name
          : (item: TreeFolder | TreeAccountWithFolder) =>
              item.type === "folder" || (item.type === "account" && item.folder === undefined)
        const overIndex = allItems
          .filter(currentFolderFilter)
          .findIndex((item) => item.id === overItem?.id)
        const nextOverItem = allItems.filter(currentFolderFilter)[overIndex + 1] ?? null
        console.log(
          "allItems",
          allItems,
          "folder",
          folder,
          "filtered",
          allItems.filter(currentFolderFilter),
          "index",
          overIndex
        )
        overItem = nextOverItem
      }

      // let folder = activeItem.type === "account" ? activeItem.folder : undefined
      // if (activeContainer !== overContainer) {
      //   // folder = overItem?.type === 'account' ? overItem?.folder
      // }

      console.log(
        "dragEnd",
        "\n\tactiveItem\t",
        activeItem.id,
        "\n\tover\t",
        over?.id,
        "\n\toverItem\t",
        overItem?.id,
        "\n\tactiveContainer\t",
        activeContainer,
        "\n\toverContainer\t",
        overContainer
      )

      const mutation: RequestPortfolioMutate | undefined =
        activeItem.type === "account"
          ? {
              type: "moveAccount",
              address: activeItem.address,
              folder: folder?.type === "folder" ? folder.name : undefined,
              // overItem?.type === "account" && overItem?.folder ? overItem?.folder : undefined,
              beforeItem:
                overItem?.type === "account"
                  ? { type: "account", address: overItem.address }
                  : overItem?.type === "folder"
                  ? { type: "folder", name: overItem.name }
                  : undefined,
            }
          : activeItem.type === "folder"
          ? {
              type: "moveFolder",
              name: activeItem.name,
              beforeItem:
                overItem?.type === "account"
                  ? { type: "account", address: overItem.address }
                  : overItem?.type === "folder"
                  ? { type: "folder", name: overItem.name }
                  : undefined,
            }
          : undefined

      console.log(mutation)

      mutation &&
        setTree((tree) => {
          const newTree = tree.slice()
          PortfolioStore.mutateTree(newTree, [mutation])
          return newTree
        })
      mutation && api.accountsPortfolioMutate([mutation])
    },
    [activeContainerId, allItems, itemsById]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4">
        <SortableContext id={rootId} items={rootItems} strategy={verticalListSortingStrategy}>
          <div className="droppable bg-green p-12" ref={setDroppableNodeRef}>
            {rootItems.map((item) => (
              <SortableTreeItem
                key={item.id}
                id={item.id}
                itemsById={itemsById}
                accounts={accounts}
              />
            ))}
          </div>
        </SortableContext>
      </div>
      <DragOverlay>
        {activeId && <TreeItem id={activeId} itemsById={itemsById} accounts={accounts} />}
      </DragOverlay>
    </DndContext>
  )
}

type TreeItemProps = {
  id: UniqueIdentifier
  itemsById: { [key: string]: TreeItem & { id: UniqueIdentifier } }
  accounts: AccountJsonAny[]
  inset?: boolean
}
type SortableProps = {
  isDragging?: boolean
  style?: {
    transform: string | undefined
    transition: string | undefined
  }
  attributes?: DraggableAttributes
  listeners?: SyntheticListenerMap
}
const SortableTreeItem = (treeItemProps: TreeItemProps) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: treeItemProps.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const sortableProps = { isDragging, style, attributes, listeners }

  const commonProps = {
    ref: setNodeRef,
    ...treeItemProps,
    ...sortableProps,
  }

  return <TreeItem {...commonProps} />
}

const TreeItem = forwardRef<HTMLDivElement, TreeItemProps & SortableProps>((props, ref) => {
  const { id, itemsById } = props
  const item = itemsById[id]
  if (!item) return null

  const commonProps = { ref, ...props }

  if (item.type === "account") return <TreeAccountItem {...commonProps} item={item} />
  return <TreeFolderItem {...commonProps} item={item} />
})
TreeItem.displayName = "TreeItem"

const TreeAccountItem = forwardRef<
  HTMLDivElement,
  TreeItemProps & SortableProps & { item: TreeAccount }
>(({ accounts, inset, item, isDragging, style, attributes, listeners }, ref) => {
  const account = accountByAddress(accounts, item.address)
  if (!account) return null

  return (
    <div
      className={classNames(
        "bg-black-secondary flex items-center gap-8 rounded-sm p-8",
        inset && "bg-black-secondary/60"
      )}
      ref={ref}
      style={style}
      {...attributes}
      {...listeners}
    >
      <DragButton />
      <AccountIcon className="text-xl" address={item.address} />
      <div className="flex grow flex-col gap-2 overflow-hidden">
        <div className="overflow-hidden text-ellipsis whitespace-nowrap">{account.name}</div>
        <div className="text-body-secondary text-sm">
          <Address address={item.address} />
        </div>
      </div>
      <pre className="overflow-hidden text-ellipsis">{JSON.stringify({ hidden: item.hidden })}</pre>
      <div className="flex flex-col gap-2">
        {/* TODO: Hide tooltip when isDragging is true */}
        {isDragging ? (
          <Fiat amount={0} currency="usd" />
        ) : (
          <WithTooltip as="div" tooltip="TODO: Add balance details" noWrap>
            <Fiat amount={0} currency="usd" />
          </WithTooltip>
        )}
      </div>
      <MoreHorizontalIcon className="shrink-0" />
    </div>
  )
})
TreeAccountItem.displayName = "TreeAccountItem"

const TreeFolderItem = forwardRef<
  HTMLDivElement,
  TreeItemProps & SortableProps & { item: TreeFolder }
>(({ itemsById, accounts, inset, item, isDragging, style, attributes, listeners }, ref) => {
  const { setNodeRef: setDroppableNodeRef } = useDroppable({ id: item.name })

  const allItems = useMemo(() => Object.values(itemsById), [itemsById])
  const folderItems = useMemo(() => withIds(item.tree), [item])

  const [open, setOpen] = useState(false)
  const handleClick = useCallback(() => setOpen((open) => !open), [])
  useEffect(() => {
    if (isDragging && open) setOpen(false)
  }, [isDragging, open])

  return (
    <>
      <div
        className={classNames(
          "bg-black-secondary flex items-center gap-8 rounded-sm p-8",
          inset && "bg-black-secondary/60"
        )}
        ref={ref}
        style={style}
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleClick}
      >
        <DragButton />
        <div className="bg-black-tertiary p-4 text-base">
          <FolderIcon style={{ color: item.color }} />
        </div>
        <div className="flex grow flex-col gap-2 overflow-hidden">
          <div className="overflow-hidden text-ellipsis whitespace-nowrap">{item.name}</div>
          <div className="text-body-secondary text-sm">Circles</div>
        </div>
        {open ? (
          <ChevronDownIcon className="text-body-disabled shrink-0" />
        ) : (
          <MoreHorizontalIcon className="shrink-0" />
        )}
      </div>

      {open ? (
        <div className="relative flex flex-col gap-4 pl-44">
          <CornerDownRightIcon className="text-grey-750 absolute left-24 top-8 text-xl" />
          <SortableContext
            id={item.name}
            items={folderItems}
            strategy={verticalListSortingStrategy}
          >
            <div className="bg-red p-12" ref={setDroppableNodeRef}>
              {folderItems.length > 0 ? (
                folderItems.map((item) => (
                  <SortableTreeItem
                    key={item.id}
                    id={item.id}
                    itemsById={itemsById}
                    accounts={accounts}
                    inset
                  />
                ))
              ) : (
                <div className="text-body-disabled flex items-center p-8">No accounts</div>
              )}
            </div>
          </SortableContext>
        </div>
      ) : null}
    </>
  )
})
TreeFolderItem.displayName = "TreeFolderItem"

const DragButton = () => <DragIcon className="text-grey-750 -mx-4 shrink-0 text-xl" />

type TreeAccountWithFolder = TreeAccount & { folder?: string }

// Create a flat list of items from a Tree
const flattenTree = (tree: Tree): Array<TreeAccountWithFolder | TreeFolder> =>
  tree.flatMap((item) =>
    item.type === "account"
      ? item
      : [
          item,
          ...item.tree.map((account): TreeAccountWithFolder => ({ ...account, folder: item.name })),
        ]
  )

// Add an id to each item in a list of TreeItems
const withIds = <T extends TreeItem>(items: T[]) =>
  items.map((item) => ({
    ...item,
    id: item.type === "account" ? `account-${item.address}` : `folder-${item.name}`,
  }))

// Collect a list of items (who each have an id field) into a map
const byId = <T extends { id: string }>(items: T[]): { [k: string]: T } =>
  Object.fromEntries(items.map((item) => [item.id, item]))

// Find an account in a list of accounts by address
const accountByAddress = (accounts: AccountJson[], address: string) =>
  accounts.find((account) => account.address === address)
