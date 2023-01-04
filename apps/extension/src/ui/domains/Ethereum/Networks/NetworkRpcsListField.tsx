import { RequestUpsertCustomEvmNetwork } from "@core/domains/ethereum/types"
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DragIcon, PlusIcon, TrashIcon } from "@talisman/theme/icons"
import { FC, useCallback, useMemo } from "react"
import {
  FieldArrayWithId,
  FieldError,
  UseFormRegister,
  UseFormTrigger,
  useFieldArray,
  useFormContext,
} from "react-hook-form"
import { FormFieldContainer, FormFieldInputText } from "talisman-ui"

import { useRegisterFieldWithDebouncedValidation } from "./useRegisterFieldWithDebouncedValidation"

type SortableRpcItemProps = {
  register: UseFormRegister<RequestUpsertCustomEvmNetwork>
  trigger: UseFormTrigger<RequestUpsertCustomEvmNetwork>
  rpc: FieldArrayWithId<RequestUpsertCustomEvmNetwork, "rpcs", "id">
  errors?: {
    url?: FieldError | undefined
  }[]
  canDelete?: boolean
  canDrag?: boolean
  onDelete?: () => void
  index: number
}

const SortableRpcField: FC<SortableRpcItemProps> = ({
  rpc,
  index,
  errors,
  register,
  trigger,
  canDelete,
  canDrag,
  onDelete,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: rpc.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dragHandleProps = canDrag ? { ...attributes, ...listeners } : {}

  // debounced validation to check url as soon as possible
  const fieldRegistration = useRegisterFieldWithDebouncedValidation(
    `rpcs.${index}.url`,
    250,
    trigger,
    register
  )

  return (
    <div ref={setNodeRef} style={style} className="w-full">
      <FormFieldInputText
        placeholder="https://"
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
              onClick={onDelete}
            >
              <TrashIcon className="transition-none" />
            </button>
          )
        }
      />
      <div className="text-alert-warn h-8 max-w-full overflow-hidden text-ellipsis whitespace-nowrap py-2 text-right text-xs uppercase leading-none">
        {errors?.[index]?.url?.message}
      </div>
    </div>
  )
}

export const NetworkRpcsListField = () => {
  const {
    register,
    trigger,
    formState: { errors },
    watch,
  } = useFormContext<RequestUpsertCustomEvmNetwork>()

  const {
    fields: rpcs,
    append,
    remove,
    move,
  } = useFieldArray<RequestUpsertCustomEvmNetwork>({
    name: "rpcs",
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
    <FormFieldContainer label="RPC URLs">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rpcIds}>
          <div className="flex w-full flex-col gap-2">
            {rpcs.map((rpc, index, arr) => (
              <SortableRpcField
                key={rpc.id}
                index={index}
                register={register}
                trigger={trigger}
                rpc={rpc}
                canDelete={canDelete}
                canDrag={arr.length > 1}
                onDelete={handleRemove(index)}
                errors={errors.rpcs}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        className="text-body-secondary hover:text-body flex gap-2 self-start text-sm"
        onClick={handleAddRpc}
      >
        <PlusIcon className="transition-none" /> Add fallback RPC
      </button>
    </FormFieldContainer>
  )
}
