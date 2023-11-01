import { RequestUpsertCustomChain } from "@core/domains/chains/types"
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
import { SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DragIcon, LoaderIcon, PlusIcon, TrashIcon } from "@talismn/icons"
import { FC, useCallback, useMemo, useRef, useState } from "react"
import { FieldArrayWithId, FieldPathValue, useFieldArray, useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FormFieldContainer, FormFieldInputText } from "talisman-ui"

import { getSubstrateRpcInfo, wsRegEx } from "./Substrate/helpers"
import { useRegisterFieldWithDebouncedValidation } from "./useRegisterFieldWithDebouncedValidation"

type RequestUpsertNetwork = RequestUpsertCustomChain | RequestUpsertCustomEvmNetwork

type SortableRpcItemProps = {
  rpc: FieldArrayWithId<RequestUpsertNetwork, "rpcs", "id">
  canDelete?: boolean
  canDrag?: boolean
  onDelete?: () => void
  index: number
  placeholder: string
}

const SortableRpcField: FC<SortableRpcItemProps> = ({
  rpc,
  index,
  canDelete,
  canDrag,
  onDelete,
  placeholder,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: rpc.id })
  const [fetchingGenesisHash, setFetchingGenesisHash] = useState(false)
  const { t } = useTranslation()
  const {
    register,
    trigger,
    setError,
    setValue,
    formState: { errors },
  } = useFormContext<RequestUpsertNetwork>()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dragHandleProps = canDrag ? { ...attributes, ...listeners } : {}

  const latestRequestRef = useRef(0)
  const getGenesisHash = useCallback(
    async <K extends `rpcs.${number}.url`>(
      name: K,
      value: FieldPathValue<RequestUpsertNetwork, K>
    ) => {
      await (async () => {
        try {
          if (!value) return
          setFetchingGenesisHash(true)
          const refId = latestRequestRef.current + 1
          latestRequestRef.current = refId

          if (!wsRegEx.test(value)) return setError(name, { message: t("Invalid URL") })

          const rpcInfo = await getSubstrateRpcInfo(value)

          // Failed connections take longer to return than successful ones, so
          // we compare current ref to the one used for this method call,
          // and no-op if it has changed to prevent race condition where bad result clobbers good one
          if (latestRequestRef.current !== refId) return
          if (!rpcInfo?.genesisHash) {
            return setError(name, { message: t("Failed to connect") })
          }
          setValue(`rpcs.${index}.genesisHash`, rpcInfo.genesisHash)
        } catch (error) {
          return setError(name, { message: t("Failed to connect") })
        }
      })()
      setFetchingGenesisHash(false)
    },
    [index, setError, setValue, t]
  )

  // debounced validation to check url as soon as possible
  const fieldRegistration = useRegisterFieldWithDebouncedValidation(
    `rpcs.${index}.url`,
    250,
    trigger,
    register,
    getGenesisHash
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
              disabled={fetchingGenesisHash}
              onClick={onDelete}
            >
              {!fetchingGenesisHash && <TrashIcon className="transition-none" />}
              {fetchingGenesisHash && <LoaderIcon className="animate-spin-slow transition-none" />}
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

export const NetworkRpcsListField = ({ placeholder = "https://" }: { placeholder?: string }) => {
  const { t } = useTranslation("admin")
  const { watch, control } = useFormContext<RequestUpsertNetwork>()

  const {
    fields: rpcs,
    append,
    remove,
    move,
  } = useFieldArray<RequestUpsertNetwork>({
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
              <SortableRpcField
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
