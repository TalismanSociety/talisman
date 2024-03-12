import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { RequestUpsertCustomEvmNetwork } from "@extension/core"
import { DragIcon, LoaderIcon, PlusIcon, TrashIcon } from "@talismn/icons"
import { FC, useCallback, useMemo } from "react"
import { FieldArrayWithId, useFieldArray, useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FormFieldContainer, FormFieldInputText } from "talisman-ui"

import { SubNetworkFormData } from "./Substrate/types"
import {
  ExtraValidationCb,
  useRegisterFieldWithDebouncedValidation,
} from "./useRegisterFieldWithDebouncedValidation"

type RpcFormData = SubNetworkFormData | RequestUpsertCustomEvmNetwork

export type SortableRpcItemProps = {
  rpc: FieldArrayWithId<RpcFormData, "rpcs", "id">
  canDelete?: boolean
  canDrag?: boolean
  onDelete?: () => void
  index: number
  placeholder: string
  isLoading?: boolean
  extraValidationCb?: ExtraValidationCb
}

export const SortableRpcField: FC<SortableRpcItemProps> = ({
  rpc,
  index,
  canDelete,
  canDrag,
  onDelete,
  placeholder,
  isLoading = false,
  extraValidationCb,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: rpc.id })
  const {
    register,
    formState: { errors },
  } = useFormContext<RpcFormData>()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dragHandleProps = canDrag ? { ...attributes, ...listeners } : {}

  // debounced validation to check url as soon as possible
  const fieldRegistration = useRegisterFieldWithDebouncedValidation(
    `rpcs.${index}.url`,
    250,
    register,
    extraValidationCb
  )

  return (
    <div ref={setNodeRef} style={style} className="w-full">
      <FormFieldInputText
        placeholder={placeholder}
        {...fieldRegistration}
        before={
          <button
            type="button"
            className="allow-focus text-md ml-[-1.2rem] px-2 opacity-80 outline-none hover:opacity-100 focus:opacity-100 disabled:opacity-50"
            disabled={!canDrag}
            {...dragHandleProps}
          >
            <DragIcon className="transition-none" />
          </button>
        }
        after={
          canDelete && (
            <button
              type="button"
              className="allow-focus text-md mr-[-1.2rem] px-2 opacity-80 outline-none hover:opacity-100 focus:opacity-100 disabled:opacity-50"
              disabled={isLoading}
              onClick={onDelete}
            >
              {!isLoading && <TrashIcon className="transition-none" />}
              {isLoading && <LoaderIcon className="animate-spin-slow transition-none" />}
            </button>
          )
        }
      />
      <div className="text-alert-warn h-8 max-w-full overflow-hidden text-ellipsis whitespace-nowrap py-2 text-right text-xs uppercase leading-none">
        {errors?.rpcs?.[index]?.url?.message}
      </div>
    </div>
  )
}

export const NetworkRpcsListField = ({
  placeholder = "https://",
  FieldComponent = SortableRpcField,
}: {
  placeholder?: string
  FieldComponent?: React.ComponentType<SortableRpcItemProps>
}) => {
  const { t } = useTranslation("admin")
  const { watch, control } = useFormContext<RpcFormData>()

  const {
    fields: rpcs,
    append,
    remove,
    move,
  } = useFieldArray<RpcFormData>({
    name: "rpcs",
    control,
  })

  const handleRemove = useCallback(
    (index: number) => () => {
      remove(index)
    },
    [remove]
  )

  const handleAddRpc = useCallback(() => {
    append({ url: "" })
  }, [append])

  // unlike rpcs variable, formData is updated live => needed to toggle icon visibility
  const formData = watch()
  const canDelete = useMemo(
    () => !!(formData?.rpcs && (formData.rpcs.length > 1 || formData.rpcs?.[0]?.url)),
    [formData]
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // order management
  const rpcIds = useMemo(() => rpcs.map(({ id }) => id), [rpcs])
  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const indexActive = rpcIds.indexOf(e.active.id as string)
      const indexOver = rpcIds.indexOf(e.over?.id as string)
      move(indexActive, indexOver)
    },
    [move, rpcIds]
  )

  return (
    <FormFieldContainer label={t("RPC URLs")}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rpcIds}>
          <div className="flex w-full flex-col gap-2">
            {rpcs.map((rpc, index, arr) => (
              <FieldComponent
                key={rpc.id}
                index={index}
                rpc={rpc}
                canDelete={canDelete}
                canDrag={arr.length > 1}
                onDelete={handleRemove(index)}
                placeholder={placeholder}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        className="text-body-secondary hover:text-body disabled:text-body-disabled flex gap-2 self-start text-sm disabled:cursor-not-allowed"
        disabled={rpcs.length >= 10}
        onClick={handleAddRpc}
      >
        <PlusIcon className="transition-none" />{" "}
        {rpcs.length >= 10 ? t("Maximum 10 RPCs allowed") : t("Add another RPC")}
      </button>
    </FormFieldContainer>
  )
}
