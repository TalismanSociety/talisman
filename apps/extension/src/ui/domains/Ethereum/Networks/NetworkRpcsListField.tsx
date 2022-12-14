import { FC, useCallback, useEffect, useMemo, useState } from "react"
import {
  FieldArrayWithId,
  FieldError,
  useFieldArray,
  useFormContext,
  UseFormRegister,
} from "react-hook-form"
import { RequestUpsertCustomEvmNetwork } from "@core/domains/ethereum/types/base"
import { HamburgerMenuIcon, PlusIcon, TrashIcon } from "@talisman/theme/icons"
import { FormFieldContainer, FormFieldInputText } from "talisman-ui"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { rpcDefinitions } from "@polkadot/types"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type SortableRpcItemProps = {
  register: UseFormRegister<RequestUpsertCustomEvmNetwork>
  rpc: FieldArrayWithId<RequestUpsertCustomEvmNetwork, "rpcs", "id">
  errors?: {
    url?: FieldError | undefined
  }[]
  canDelete?: boolean
  onDelete?: () => void
  onChange?: () => void
  index: number
}

const SortableRpcField: FC<SortableRpcItemProps> = ({
  rpc,
  index,
  errors,
  register,
  canDelete,
  onDelete,
  onChange,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: rpc.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="w-full">
      <FormFieldInputText
        placeholder="https://1rpc.io/eth"
        {...register(`rpcs.${index}.url`, {
          onChange,
        })}
        before={
          <button
            type="button"
            className="allow-focus text-md ml-[-1.2rem] px-2 opacity-80 outline-none hover:opacity-100 focus:opacity-100 disabled:opacity-50"
            {...attributes}
            {...listeners}
          >
            <HamburgerMenuIcon className="rotate-90 transition-none" />
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
    formState: { errors },
    getValues,
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

  const autoAppend = useCallback(() => {
    const { rpcs } = getValues()
    if (rpcs && !rpcs.length) append({ url: "" })
  }, [append, getValues])

  useEffect(() => {
    autoAppend()
  }, [autoAppend])

  const handleRemove = useCallback(
    (index: number) => () => {
      remove(index)
      autoAppend()
    },
    [autoAppend, remove]
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

  // define the order of entries (for drag n drop reordering)
  // const [rpcIds, setRpcIds] = useState(() => rpcs.map((rpc) => rpc.id))
  // useEffect(() => {
  //   setRpcIds(() => rpcs.map((rpc) => rpc.id))
  // }, [rpcs])

  const rpcIds = useMemo(() => rpcs.map(({ id }) => id), [rpcs])
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      const indexActive = rpcs.findIndex((rpc) => rpc.id === active.id)
      const indexOver = rpcs.findIndex((rpc) => rpc.id === over?.id)

      move(indexActive, indexOver)
    },
    [move, rpcs]
  )

  return (
    <FormFieldContainer label="RPC URLs">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rpcIds}>
          <div className="flex w-full flex-col gap-2">
            {rpcs.map((rpc, index) => (
              <SortableRpcField
                key={rpc.id}
                index={index}
                register={register}
                rpc={rpc}
                onChange={autoAppend}
                canDelete={canDelete}
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
