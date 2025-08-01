/* eslint-disable react/no-children-prop */
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DotNetworkSchema, isNetworkDot, SolNetworkSchema } from "@talismn/chaindata-provider"
import { DragIcon, LoaderIcon, PlusIcon, TrashIcon } from "@talismn/icons"
import { TFunction } from "i18next"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { FormFieldContainer, FormFieldInputText } from "talisman-ui"
import { z } from "zod/v4"

import {
  fetchEthChainId,
  getDotGenesisHashFromRpc,
  getSolGenesisHashFromRpc,
} from "@ui/domains/Networks/helpers"

import { RpcFormData, useNetworkForm } from "./context"

export const NetworkRpcsField = ({
  FieldComponent = SortableRpcField,
}: {
  placeholder?: string
  FieldComponent?: React.ComponentType<SortableRpcItemProps>
}) => {
  const { t } = useTranslation()

  const { network, form } = useNetworkForm()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  return (
    <form.Field
      name="rpcs"
      children={(fieldRpcs) => (
        <FormFieldContainer label={t("RPC URLs")}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e: DragEndEvent) => {
              const indexActive = fieldRpcs.state.value.findIndex((rpc) => rpc.id === e.active.id)
              const indexOver = fieldRpcs.state.value.findIndex((rpc) => rpc.id === e.over?.id)
              fieldRpcs.moveValue(indexActive, indexOver)
            }}
          >
            <SortableContext items={fieldRpcs.state.value.map((rpc) => rpc.id)}>
              <div className="flex w-full flex-col gap-2">
                {fieldRpcs.state.value.map((rpc, index, arr) => (
                  <FieldComponent
                    key={rpc.id}
                    index={index}
                    rpc={rpc}
                    canDelete={fieldRpcs.state.value.length > 1}
                    canDrag={arr.length > 1}
                    onDelete={() => fieldRpcs.removeValue(index)}
                    placeholder={isNetworkDot(network) ? "wss://" : "https://"}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button
            type="button"
            className="text-body-secondary hover:text-body disabled:text-body-disabled flex gap-2 self-start text-sm disabled:cursor-not-allowed"
            disabled={fieldRpcs.state.value.length >= 10}
            onClick={() => fieldRpcs.pushValue({ id: crypto.randomUUID(), url: "" })} // append({ url: "" }) TODO}
          >
            <PlusIcon className="transition-none" />{" "}
            {fieldRpcs.state.value.length >= 10
              ? t("Maximum 10 RPCs allowed")
              : t("Add another RPC")}
          </button>
        </FormFieldContainer>
      )}
    />
  )
}

export type SortableRpcItemProps = {
  rpc: RpcFormData
  canDelete?: boolean
  canDrag?: boolean
  onDelete?: () => void
  index: number
  placeholder: string
}

export const SortableRpcField: FC<SortableRpcItemProps> = ({
  rpc,
  index,
  canDelete,
  canDrag,
  onDelete,
  placeholder,
}) => {
  const { t } = useTranslation()
  const { form, network } = useNetworkForm()
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: rpc.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dragHandleProps = canDrag ? { ...attributes, ...listeners } : {}

  return (
    <div ref={setNodeRef} style={style} className="w-full">
      <form.Field
        name={`rpcs[${index}].url`}
        children={(field) => (
          <>
            <FormFieldInputText
              placeholder={placeholder}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
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
                field.state.meta.isValidating ? (
                  <div className="mr-[-1.2rem] shrink-0 px-2">
                    <LoaderIcon className="animate-spin-slow transition-none" />
                  </div>
                ) : canDelete ? (
                  <button
                    type="button"
                    className="allow-focus text-md mr-[-1.2rem] shrink-0 px-2 opacity-80 outline-none hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                    onClick={onDelete}
                  >
                    <TrashIcon className="transition-none" />
                  </button>
                ) : null
              }
            />
            <div className="text-alert-warn h-8 max-w-full overflow-hidden text-ellipsis whitespace-nowrap py-2 text-right text-xs uppercase leading-none">
              {field.state.meta.errors[0]}
            </div>
          </>
        )}
        asyncDebounceMs={150}
        validators={{
          onChangeAsync: async ({ value, signal }) => {
            if (!value) return t("Url is required")
            try {
              switch (network.platform) {
                case "polkadot": {
                  const genesisHash = await fetchDotGenesisHash(t, value)
                  if (genesisHash !== network.genesisHash)
                    return t("RPC doesn't match chain's genesis hash")
                  return undefined
                }
                case "ethereum": {
                  const chainId = await fetchEthChainId(value, signal)
                  if (chainId !== network.id) return t("RPC doesn't match chain's chain ID")
                  return undefined
                }
                case "solana": {
                  const genesisHash = await fetchSolGenesisHash(t, value)
                  if (genesisHash !== network.genesisHash)
                    return t("RPC doesn't match chain's genesis hash")
                  return undefined
                }
              }
            } catch (err) {
              return err instanceof Error ? err.message : String("Invalid RPC url")
            }
          },
        }}
      />
    </div>
  )
}

const fetchDotGenesisHash = async (t: TFunction, rpcUrl: string) => {
  const parsedRpcUrl = z.url({ protocol: /^wss?$/ }).safeParse(rpcUrl) // validate URL
  if (!parsedRpcUrl.success) throw new Error(parsedRpcUrl.error.issues[0].message)

  const genesisHash = await getDotGenesisHashFromRpc(parsedRpcUrl.data)
  if (!genesisHash) throw new Error(t("Failed to query RPC"))

  const parsedGenesisHash = DotNetworkSchema.shape.genesisHash.safeParse(genesisHash)
  if (!parsedGenesisHash.success) throw new Error(parsedGenesisHash.error.issues[0].message)

  return parsedGenesisHash.data
}

const fetchSolGenesisHash = async (t: TFunction, rpcUrl: string) => {
  const parsedRpcUrl = z.url({ protocol: /^https?$/ }).safeParse(rpcUrl) // validate URL
  if (!parsedRpcUrl.success) throw new Error(parsedRpcUrl.error.issues[0].message)

  const genesisHash = await getSolGenesisHashFromRpc(parsedRpcUrl.data)
  if (!genesisHash) throw new Error(t("Failed to query RPC"))

  const parsedGenesisHash = SolNetworkSchema.shape.genesisHash.safeParse(genesisHash)
  if (!parsedGenesisHash.success) throw new Error(parsedGenesisHash.error.issues[0].message)

  return parsedGenesisHash.data
}
