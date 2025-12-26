import { ActionArgumentsDto, ArgumentSchemaDto } from "extension-core"
import { log } from "extension-shared"
import { useMemo } from "react"

type UseYieldxyzEnterTransactionProps = {
  schema: ArgumentSchemaDto | null | undefined
  inputs: ActionArgumentsDto | null
}

export const useYieldxyzActionValidation = ({
  schema,
  inputs,
}: UseYieldxyzEnterTransactionProps) => {
  return useMemo(() => {
    if (!schema || !inputs) return { args: null, error: null }

    const result = { args: {} as ActionArgumentsDto | null, error: null as string | null }

    try {
      for (const field of schema.fields) {
        if (field.required && !inputs[field.name]) {
          result.error = `${field.name} is required`
          result.args = null
          break
        }

        if (inputs[field.name]) {
          const value = inputs[field.name as keyof ActionArgumentsDto]

          if (field.minimum && Number(value) < Number(field.minimum)) {
            result.error = `Minimum ${field.name} is ${field.minimum}`
            result.args = null
            break
          }

          if (field.maximum && Number(value) > Number(field.maximum)) {
            result.error = `Maximum ${field.name} is ${field.maximum}`
            result.args = null
            break
          }

          const args = result.args as Record<string, unknown>
          args[field.name] = value
        }
      }

      return result
    } catch (err) {
      log.error("useYieldxyzActionValidation: error during validation", { err, schema, inputs })
      return {
        args: null,
        error: "Invalid arguments",
      }
    }
  }, [inputs, schema])
}
