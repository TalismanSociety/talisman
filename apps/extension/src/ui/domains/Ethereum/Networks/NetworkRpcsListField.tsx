import { useCallback, useEffect, useMemo } from "react"
import { useFieldArray, useFormContext } from "react-hook-form"
import { RequestUpsertCustomEvmNetwork } from "@core/domains/ethereum/types/base"
import { PlusIcon, TrashIcon } from "@talisman/theme/icons"
import { FormFieldContainer, FormFieldInputText } from "talisman-ui"

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
    () => formData?.rpcs && (formData.rpcs.length > 1 || formData.rpcs?.[0]?.url),
    [formData]
  )

  return (
    <FormFieldContainer label="RPC URLs">
      <div className="flex w-full flex-col gap-2">
        {rpcs.map((rpc, index) => (
          <div key={rpc.id} className="w-full">
            <FormFieldInputText
              placeholder="https://1rpc.io/eth"
              {...register(`rpcs.${index}.url`, {
                onChange: autoAppend,
              })}
              after={
                canDelete && (
                  <button
                    type="button"
                    className="allow-focus mr-[-1.2rem] px-2 text-lg opacity-80 outline-none hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                    onClick={handleRemove(index)}
                  >
                    <TrashIcon className="transition-none" />
                  </button>
                )
              }
            />
            <div className="text-alert-warn h-8 max-w-full overflow-hidden text-ellipsis whitespace-nowrap py-2 text-right text-xs uppercase leading-none">
              {errors.rpcs?.[index]?.url?.message}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="text-body-secondary hover:text-body flex gap-2 self-start text-sm"
          onClick={handleAddRpc}
        >
          <PlusIcon className="transition-none" /> Add fallback RPC
        </button>
      </div>
    </FormFieldContainer>
  )
}
